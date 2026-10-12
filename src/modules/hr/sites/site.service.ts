import { Site, ISite } from '../../../models/Site';
import { SitePriceHistory } from '../../../models/SitePriceHistory';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';
import { SiteStatus } from '../../../types';

/** Server-side sortable columns (the ⇅ headers in the site table). */
const SORTABLE: Record<string, string> = {
  siteName: 'siteName',
  siteCode: 'siteCode',
  branch: 'branch',
  city: 'city',
  subCity: 'subCity',
  wereda: 'wereda',
  numberOfEmployees: 'numberOfEmployees',
  paymentPrice: 'paymentPrice',
  agreementStartDate: 'agreementStartDate',
  agreementEndDate: 'agreementEndDate',
  status: 'status',
  createdAt: 'createdAt',
};

export class SiteService {
  static async getAll(query: { page?: number; limit?: number; status?: string; search?: string; sort?: string; dir?: string }) {
    const { page = 1, limit = 20, status, search, sort = 'createdAt', dir = 'desc' } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { siteName: { $regex: search, $options: 'i' } },
        { siteCode: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { subCity: { $regex: search, $options: 'i' } },
      ];
    }

    const sortField = SORTABLE[sort] || 'createdAt';
    const sortDir = dir === 'desc' ? -1 : 1;

    const [sites, total] = await Promise.all([
      Site.find(filter).populate('companyId', 'name code').sort({ [sortField]: sortDir }).skip(skip).limit(limit),
      Site.countDocuments(filter),
    ]);
    return { data: sites, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<ISite> {
    const site = await Site.findById(id);
    if (!site) throw ApiError.notFound('Site not found');
    return site;
  }

  static async create(data: Partial<ISite>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<ISite> {
    if (!data || typeof data !== 'object') throw ApiError.badRequest('A request body is required');
    if (!data.siteCode || !String(data.siteCode).trim()) throw ApiError.badRequest('siteCode is required');
    if (!data.siteName || !String(data.siteName).trim()) throw ApiError.badRequest('siteName is required');
    if (!data.location || !String(data.location).trim()) throw ApiError.badRequest('location is required');
    const existing = await Site.findOne({ siteCode: data.siteCode });
    if (existing) throw ApiError.conflict('Site code already exists');
    const site = await Site.create(data);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'SITE_CREATE',
        entity: 'Site',
        entityId: (site._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.site.created', { siteId: site._id, siteCode: site.siteCode });

    return site;
  }

  static async update(id: string, data: Partial<ISite>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<ISite> {
    const old = await Site.findById(id);
    if (!old) throw ApiError.notFound('Site not found');
    const oldValues = old.toObject();

    // Reactivating from INACTIVE clears the deactivation stamp
    const wasInactive = old.status === SiteStatus.INACTIVE;
    const willReactivate = wasInactive && !!data.status && data.status !== SiteStatus.INACTIVE;

    const update: any = { ...data };
    if (willReactivate) {
      delete update.deactivatedAt;
      update.$unset = { deactivatedAt: 1 };
    }

    const site = await Site.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!site) throw ApiError.notFound('Site not found');

    // The OLD price is never lost when a site's billing figures are edited:
    // every change is written to SitePriceHistory (previous -> current), so the
    // full price timeline stays available in the site view.
    const oldPrice = Number(old.paymentPrice ?? 0);
    const newPrice = Number(site.paymentPrice ?? 0);
    const oldEmployees = Number(old.numberOfEmployees ?? 0);
    const newEmployees = Number(site.numberOfEmployees ?? 0);
    if (oldPrice !== newPrice || oldEmployees !== newEmployees) {
      await SitePriceHistory.create({
        siteId: id as any,
        previous: { paymentPrice: oldPrice, numberOfEmployees: oldEmployees },
        current: { paymentPrice: newPrice, numberOfEmployees: newEmployees },
        changedBy: auditCtx ? (auditCtx.userId as any) : null,
      });
      eventBus.emit('hr.site.priceChanged', {
        siteId: id,
        previousPrice: oldPrice,
        newPrice,
      });
    }

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'SITE_UPDATE',
        entity: 'Site',
        entityId: id,
        oldValues: { siteName: oldValues.siteName, siteCode: oldValues.siteCode, client: oldValues.client, status: oldValues.status },
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.site.updated', { siteId: id });

    return site;
  }

  /**
   * Soft-deactivate: set status=INACTIVE, stamp deactivatedAt,
   * relieve all current PrimarySiteAssignments and active ShiftAssignments.
   * History (isCurrent=false rows) is kept for the Guards tab.
   */
  static async delete(id: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<void> {
    const site = await Site.findById(id);
    if (!site) throw ApiError.notFound('Site not found');
    if (site.status === SiteStatus.INACTIVE) throw ApiError.badRequest('Site is already inactive');

    const now = new Date();
    site.status = SiteStatus.INACTIVE;
    site.deactivatedAt = now;
    await site.save();

    // Relieve current primary site assignments
    const relieved = await PrimarySiteAssignment.updateMany(
      { siteId: id, isCurrent: true },
      { isCurrent: false, effectiveTo: now },
    );

    // Deactivate active shift assignments for this site
    await ShiftAssignment.updateMany(
      { siteId: id, status: 'ACTIVE' },
      { status: 'INACTIVE' },
    );

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'SITE_DEACTIVATE',
        entity: 'Site',
        entityId: id,
        oldValues: { status: SiteStatus.ACTIVE },
        newValues: {
          status: SiteStatus.INACTIVE,
          deactivatedAt: now.toISOString(),
          relievedAssignments: relieved.modifiedCount,
        },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.site.deactivated', {
      siteId: id,
      siteCode: site.siteCode,
      deactivatedAt: now,
      relievedAssignments: relieved.modifiedCount,
    });
  }
}
