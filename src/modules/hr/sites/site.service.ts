import { Site, ISite } from '../../../models/Site';
import { Company } from '../../../models/Company';
import mongoose from 'mongoose';
import { SitePriceHistory } from '../../../models/SitePriceHistory';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { ShiftTemplate } from '../../../models/ShiftTemplate';
import { GuardAttendanceRecord } from '../../../models/GuardAttendanceRecord';
import { GuardMonthlyHours } from '../../../models/GuardMonthlyHours';
import { GuardPatrolScan } from '../../../models/GuardPatrolScan';
import { GuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { GuardShift } from '../../../models/GuardShift';
import { GuardSiteCompensation } from '../../../models/GuardSiteCompensation';
import { Employee } from '../../../models/Employee';
import { Rotation } from '../../../models/Rotation';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { SiteNote } from '../../../models/SiteNote';
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
  /**
   * DEF-H1: a site may only reference a company that actually exists.
   * - `companyId` absent/empty/null           → stays null (site without parent)
   * - not a well-formed ObjectId (malformed)  → 400, nothing is written
   * - well-formed but no such Company row     → 404, nothing is written
   */
  static async validateCompanyId(companyId: unknown): Promise<void> {
    if (companyId === undefined || companyId === null || companyId === '') return;
    const raw = String(companyId).trim();
    if (raw === '') return;
    if (!mongoose.isValidObjectId(raw) || !/^[0-9a-fA-F]{24}$/.test(raw)) {
      throw ApiError.badRequest(`companyId '${raw}' is not a valid company id (expected a 24-character ObjectId)`);
    }
    const exists = await Company.exists({ _id: raw });
    if (!exists) {
      throw ApiError.notFound(`Company '${raw}' does not exist — create the company before referencing it`);
    }
  }

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
    // Validate BEFORE creating anything — no partial records on failure.
    await SiteService.validateCompanyId(data.companyId);
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
    // Same company-reference validation applies when a site is repointed.
    await SiteService.validateCompanyId(data.companyId);

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

  /**
   * Permanent removal (force delete) — the site is deleted even when guards are
   * assigned to it or it already has operational history.
   *
   * Everything that references the site — guard assignments, shift assignments,
   * shift templates, attendance, monthly hours, site compensation, rotations,
   * rotation assignments, notes, price history, guard shifts and QR scans — is
   * removed in the same pass, and employees whose home site it was are reset, so
   * no row is left pointing at a site that no longer exists. Guard payroll
   * records are deliberately kept: they store their own site name/code snapshot,
   * so guard pay history survives the deletion. Use deactivate instead when the
   * history must stay visible in the site module itself.
   */
  static async deletePermanent(
    id: string,
    auditCtx?: { userId: string; ip?: string; ua?: string },
  ): Promise<{ siteName: string; removed: { label: string; count: number }[]; keptPayrollRecords: number }> {
    const site = await Site.findById(id);
    if (!site) throw ApiError.notFound('Site not found');

    const [
      assignments, shiftAssignments, shiftTemplates, attendance, monthlyHours,
      compensations, payrollRecords, notes, priceHistory, rotations,
      rotationAssignments, shifts, scans,
    ] = await Promise.all([
      PrimarySiteAssignment.countDocuments({ siteId: id }),
      ShiftAssignment.countDocuments({ siteId: id }),
      ShiftTemplate.countDocuments({ siteId: id }),
      GuardAttendanceRecord.countDocuments({ siteId: id }),
      GuardMonthlyHours.countDocuments({ siteId: id }),
      GuardSiteCompensation.countDocuments({ siteId: id }),
      GuardPayrollRecord.countDocuments({ $or: [{ 'primarySite.siteId': id }, { 'additionalSites.siteId': id }] }),
      SiteNote.countDocuments({ siteId: id }),
      SitePriceHistory.countDocuments({ siteId: id }),
      Rotation.countDocuments({ siteId: id }),
      RotationAssignment.countDocuments({ siteId: id }),
      GuardShift.countDocuments({ siteId: id }),
      GuardPatrolScan.countDocuments({ siteId: id }),
    ]);

    // FORCE DELETE — the site is always deleted, even when guards were assigned
    // to it. Everything that points at the site is removed in the same pass so
    // no guard, shift, attendance row or rotation is left referencing a site
    // that no longer exists, and assigned guards are relieved automatically.
    // Guard payroll records are kept on purpose: each one stores its own site
    // name/code snapshot, so guard pay history survives the site being deleted.
    await Promise.all([
      PrimarySiteAssignment.deleteMany({ siteId: id }),
      ShiftAssignment.deleteMany({ siteId: id }),
      ShiftTemplate.deleteMany({ siteId: id }),
      GuardAttendanceRecord.deleteMany({ siteId: id }),
      GuardMonthlyHours.deleteMany({ siteId: id }),
      GuardSiteCompensation.deleteMany({ siteId: id }),
      SiteNote.deleteMany({ siteId: id }),
      SitePriceHistory.deleteMany({ siteId: id }),
      Rotation.deleteMany({ siteId: id }),
      RotationAssignment.deleteMany({ siteId: id }),
      GuardShift.deleteMany({ siteId: id }),
      GuardPatrolScan.deleteMany({ siteId: id }),
      Employee.updateMany({ homeSiteId: id }, { $set: { homeSiteId: null } }),
    ]);

    await Site.deleteOne({ _id: id });

    const removed = [
      { count: assignments, label: `guard assignment${assignments === 1 ? '' : 's'}` },
      { count: shiftAssignments, label: `shift assignment${shiftAssignments === 1 ? '' : 's'}` },
      { count: shiftTemplates, label: `shift template${shiftTemplates === 1 ? '' : 's'}` },
      { count: attendance, label: `attendance record${attendance === 1 ? '' : 's'}` },
      { count: monthlyHours, label: `monthly hours sheet${monthlyHours === 1 ? '' : 's'}` },
      { count: compensations, label: `compensation rate${compensations === 1 ? '' : 's'}` },
      { count: notes, label: `site note${notes === 1 ? '' : 's'}` },
      { count: priceHistory, label: `price change${priceHistory === 1 ? '' : 's'}` },
      { count: rotations, label: `rotation${rotations === 1 ? '' : 's'}` },
      { count: rotationAssignments, label: `rotation assignment${rotationAssignments === 1 ? '' : 's'}` },
      { count: shifts, label: `guard shift${shifts === 1 ? '' : 's'}` },
      { count: scans, label: `patrol scan${scans === 1 ? '' : 's'}` },
    ].filter((r) => r.count > 0);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'SITE_DELETE',
        entity: 'Site',
        entityId: id,
        oldValues: {
          siteName: site.siteName,
          siteCode: site.siteCode,
          status: site.status,
          location: site.location,
          forceDeleted: removed,
          keptPayrollRecords: payrollRecords,
        },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.site.deleted', { siteId: id, siteCode: site.siteCode, removed });

    return { siteName: site.siteName, removed, keptPayrollRecords: payrollRecords };
  }
}
