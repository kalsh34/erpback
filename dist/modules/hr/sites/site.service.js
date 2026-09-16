"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteService = void 0;
const Site_1 = require("../../../models/Site");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
const types_1 = require("../../../types");
class SiteService {
    static async getAll(query) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { siteName: { $regex: search, $options: 'i' } },
                { siteCode: { $regex: search, $options: 'i' } },
                { client: { $regex: search, $options: 'i' } },
            ];
        }
        const [sites, total] = await Promise.all([
            Site_1.Site.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
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
        const site = await Site_1.Site.findByIdAndUpdate(id, data, { new: true, runValidators: true });
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
    static async delete(id, auditCtx) {
        const site = await Site_1.Site.findById(id);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        if (site.status === types_1.SiteStatus.INACTIVE)
            throw ApiError_1.ApiError.badRequest('Site is already inactive');
        site.status = types_1.SiteStatus.INACTIVE;
        await site.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'SITE_DEACTIVATE',
                entity: 'Site',
                entityId: id,
                oldValues: { status: types_1.SiteStatus.ACTIVE },
                newValues: { status: types_1.SiteStatus.INACTIVE },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.site.deactivated', { siteId: id, siteCode: site.siteCode });
    }
}
exports.SiteService = SiteService;
//# sourceMappingURL=site.service.js.map