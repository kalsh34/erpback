import { Site, ISite } from '../../../models/Site';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';
import { SiteStatus } from '../../../types';

export class SiteService {
  static async getAll(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { siteName: { $regex: search, $options: 'i' } },
        { siteCode: { $regex: search, $options: 'i' } },
        { client: { $regex: search, $options: 'i' } },
      ];
    }
    const [sites, total] = await Promise.all([
      Site.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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

    const site = await Site.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!site) throw ApiError.notFound('Site not found');

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

  static async delete(id: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<void> {
    const site = await Site.findById(id);
    if (!site) throw ApiError.notFound('Site not found');
    if (site.status === SiteStatus.INACTIVE) throw ApiError.badRequest('Site is already inactive');

    site.status = SiteStatus.INACTIVE;
    await site.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'SITE_DEACTIVATE',
        entity: 'Site',
        entityId: id,
        oldValues: { status: SiteStatus.ACTIVE },
        newValues: { status: SiteStatus.INACTIVE },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.site.deactivated', { siteId: id, siteCode: site.siteCode });
  }
}
