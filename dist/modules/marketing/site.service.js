"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaSiteService = void 0;
const mongoose_1 = require("mongoose");
const ProformaSite_1 = require("../../models/ProformaSite");
const ProformaCompany_1 = require("../../models/ProformaCompany");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const AuditLog_1 = require("../../models/AuditLog");
function text(value, label, max = 300) {
    if (value === undefined || value === null)
        return '';
    const s = String(value).trim();
    if (s.length > max)
        throw ApiError_1.ApiError.badRequest(`${label} must be at most ${max} characters`);
    return s;
}
function requiredText(value, label, max = 300) {
    const s = text(value, label, max);
    if (!s)
        throw ApiError_1.ApiError.badRequest(`${label} is required`);
    return s;
}
/**
 * Client sites. A site always belongs to a registered company and can only be
 * quoted while both it and its company are ACTIVE.
 */
class ProformaSiteService {
    static async getAll(options) {
        const filter = {};
        if (options.companyId) {
            if (!mongoose_1.Types.ObjectId.isValid(options.companyId))
                throw ApiError_1.ApiError.badRequest('companyId must be a valid company id');
            filter.companyId = new mongoose_1.Types.ObjectId(options.companyId);
        }
        if (options.status && options.status !== 'ALL') {
            if (!Object.values(types_1.CompanyStatus).includes(options.status)) {
                throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(types_1.CompanyStatus).join(', ')}, ALL`);
            }
            filter.status = options.status;
        }
        else if (options.activeOnly === 'true') {
            filter.status = types_1.CompanyStatus.ACTIVE;
        }
        if (options.search) {
            const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ siteName: rx }, { city: rx }, { address: rx }];
        }
        const sites = await ProformaSite_1.ProformaSite.find(filter).sort({ siteName: 1 });
        return { data: sites };
    }
    static async getById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            throw ApiError_1.ApiError.badRequest('Invalid site id');
        const site = await ProformaSite_1.ProformaSite.findById(id);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        return site;
    }
    static async create(input, ctx) {
        const companyId = requiredText(input.companyId, 'companyId', 64);
        if (!mongoose_1.Types.ObjectId.isValid(companyId))
            throw ApiError_1.ApiError.badRequest('companyId must be a valid company id');
        const company = await ProformaCompany_1.ProformaCompany.findById(companyId);
        if (!company)
            throw ApiError_1.ApiError.badRequest('The selected company is not registered');
        if (company.status !== types_1.CompanyStatus.ACTIVE) {
            throw ApiError_1.ApiError.badRequest('Sites can only be added to an active company');
        }
        const data = {
            companyId: new mongoose_1.Types.ObjectId(companyId),
            siteName: requiredText(input.siteName, 'Site name', 200),
            address: text(input.address, 'Site address', 400),
            city: text(input.city, 'City', 120) || company.city,
            region: text(input.region, 'Region', 120) || company.region,
            specialRequirements: text(input.specialRequirements, 'Special requirements', 2000),
            status: types_1.CompanyStatus.ACTIVE,
        };
        const site = await ProformaSite_1.ProformaSite.create(data);
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'PROFORMA_SITE_CREATE',
                entity: 'ProformaSite',
                entityId: site._id,
                newValues: data,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return site;
    }
    static async update(id, input, ctx) {
        const site = await ProformaSiteService.getById(id);
        const oldValues = site.toObject();
        if (input.siteName !== undefined)
            site.siteName = requiredText(input.siteName, 'Site name', 200);
        if (input.address !== undefined)
            site.address = text(input.address, 'Site address', 400);
        if (input.city !== undefined)
            site.city = text(input.city, 'City', 120);
        if (input.region !== undefined)
            site.region = text(input.region, 'Region', 120);
        if (input.specialRequirements !== undefined) {
            site.specialRequirements = text(input.specialRequirements, 'Special requirements', 2000);
        }
        if (input.status !== undefined) {
            if (!Object.values(types_1.CompanyStatus).includes(input.status)) {
                throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(types_1.CompanyStatus).join(', ')}`);
            }
            site.status = input.status;
        }
        await site.save();
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'PROFORMA_SITE_UPDATE',
                entity: 'ProformaSite',
                entityId: site._id,
                oldValues,
                newValues: input,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return site;
    }
}
exports.ProformaSiteService = ProformaSiteService;
//# sourceMappingURL=site.service.js.map