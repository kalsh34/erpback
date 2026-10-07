"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteService = void 0;
const Site_1 = require("../../../models/Site");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
const types_1 = require("../../../types");
/** Server-side sortable columns (the ⇅ headers in the site table). */
const SORTABLE = {
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
class SiteService {
    static async getAll(query) {
        const { page = 1, limit = 20, status, search, sort = 'createdAt', dir = 'desc' } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.status = status;
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
            Site_1.Site.find(filter).populate('companyId', 'name code').sort({ [sortField]: sortDir }).skip(skip).limit(limit),
            Site_1.Site.countDocuments(filter),
        ]);
        return { data: sites, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const site = await Site_1.Site.findById(id);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        return site;
    }
    static async create(data, auditCtx) {
        const existing = await Site_1.Site.findOne({ siteCode: data.siteCode });
        if (existing)
            throw ApiError_1.ApiError.conflict('Site code already exists');
        const site = await Site_1.Site.create(data);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'SITE_CREATE',
                entity: 'Site',
                entityId: site._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.site.created', { siteId: site._id, siteCode: site.siteCode });
        return site;
    }
    static async update(id, data, auditCtx) {
        const old = await Site_1.Site.findById(id);
        if (!old)
            throw ApiError_1.ApiError.notFound('Site not found');
        const oldValues = old.toObject();
        // Reactivating from INACTIVE clears the deactivation stamp
        const wasInactive = old.status === types_1.SiteStatus.INACTIVE;
        const willReactivate = wasInactive && !!data.status && data.status !== types_1.SiteStatus.INACTIVE;
        const update = { ...data };
        if (willReactivate) {
            delete update.deactivatedAt;
            update.$unset = { deactivatedAt: 1 };
        }
        const site = await Site_1.Site.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'SITE_UPDATE',
                entity: 'Site',
                entityId: id,
                oldValues: { siteName: oldValues.siteName, siteCode: oldValues.siteCode, client: oldValues.client, status: oldValues.status },
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.site.updated', { siteId: id });
        return site;
    }
    /**
     * Soft-deactivate: set status=INACTIVE, stamp deactivatedAt,
     * relieve all current PrimarySiteAssignments and active ShiftAssignments.
     * History (isCurrent=false rows) is kept for the Guards tab.
     */
    static async delete(id, auditCtx) {
        const site = await Site_1.Site.findById(id);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        if (site.status === types_1.SiteStatus.INACTIVE)
            throw ApiError_1.ApiError.badRequest('Site is already inactive');
        const now = new Date();
        site.status = types_1.SiteStatus.INACTIVE;
        site.deactivatedAt = now;
        await site.save();
        // Relieve current primary site assignments
        const relieved = await PrimarySiteAssignment_1.PrimarySiteAssignment.updateMany({ siteId: id, isCurrent: true }, { isCurrent: false, effectiveTo: now });
        // Deactivate active shift assignments for this site
        await ShiftAssignment_1.ShiftAssignment.updateMany({ siteId: id, status: 'ACTIVE' }, { status: 'INACTIVE' });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'SITE_DEACTIVATE',
                entity: 'Site',
                entityId: id,
                oldValues: { status: types_1.SiteStatus.ACTIVE },
                newValues: {
                    status: types_1.SiteStatus.INACTIVE,
                    deactivatedAt: now.toISOString(),
                    relievedAssignments: relieved.modifiedCount,
                },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.site.deactivated', {
            siteId: id,
            siteCode: site.siteCode,
            deactivatedAt: now,
            relievedAssignments: relieved.modifiedCount,
        });
    }
}
exports.SiteService = SiteService;
//# sourceMappingURL=site.service.js.map