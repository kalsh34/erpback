"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const Company_1 = require("../../../models/Company");
const types_1 = require("../../../types");
const Site_1 = require("../../../models/Site");
const Employee_1 = require("../../../models/Employee");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
/** Server-side sortable columns (the ⇅ headers in the company table). */
const SORTABLE = {
    name: 'name',
    code: 'code',
    email: 'email',
    phone: 'phone',
    tin: 'tin',
    paymentPrice: 'paymentPrice',
    defaultOtPrice: 'defaultOtPrice',
    agreementStartDate: 'agreementStartDate',
    agreementEndDate: 'agreementEndDate',
    status: 'status',
    createdAt: 'createdAt',
};
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
class CompanyService {
    static async getAll(query) {
        const { page = 1, limit = 20, status, search, sort = 'name', dir = 'asc' } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { tin: { $regex: search, $options: 'i' } },
            ];
        }
        const sortField = SORTABLE[sort] || 'name';
        const sortDir = dir === 'desc' ? -1 : 1;
        const [companies, total] = await Promise.all([
            Company_1.Company.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit),
            Company_1.Company.countDocuments(filter),
        ]);
        // Derived columns: Sites = sites owned by the company,
        // Employees = staff linked directly (companyId) or deployed at one of its sites (homeSiteId).
        const siteCountByCompany = new Map();
        const employeeCountByCompany = new Map();
        const ids = companies.map((c) => c._id);
        if (ids.length > 0) {
            const [siteRows, companySiteRows] = await Promise.all([
                Site_1.Site.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
                Site_1.Site.find({ companyId: { $in: ids } }).select('_id companyId').lean(),
            ]);
            for (const row of siteRows)
                siteCountByCompany.set(String(row._id), row.count);
            const siteToCompany = new Map(companySiteRows.map((s) => [String(s._id), String(s.companyId)]));
            const siteIds = companySiteRows.map((s) => s._id);
            const employeeRows = await Employee_1.Employee.find({
                $or: [
                    { companyId: { $in: ids } },
                    ...(siteIds.length > 0 ? [{ homeSiteId: { $in: siteIds } }] : []),
                ],
            })
                .select('companyId homeSiteId')
                .lean();
            const idSet = new Set(ids.map(String));
            for (const emp of employeeRows) {
                let owner = emp.companyId ? String(emp.companyId) : null;
                if (!owner && emp.homeSiteId)
                    owner = siteToCompany.get(String(emp.homeSiteId)) || null;
                if (owner && idSet.has(owner)) {
                    employeeCountByCompany.set(owner, (employeeCountByCompany.get(owner) || 0) + 1);
                }
            }
        }
        const data = companies.map((c) => {
            const obj = c.toObject();
            return {
                ...obj,
                siteCount: siteCountByCompany.get(String(c._id)) || 0,
                employeeCount: employeeCountByCompany.get(String(c._id)) || 0,
            };
        });
        return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const company = await Company_1.Company.findById(id);
        if (!company)
            throw ApiError_1.ApiError.notFound('Company not found');
        return company;
    }
    /** Company + its sites (Name link / View action opens this). */
    static async getDetail(id) {
        const company = await Company_1.Company.findById(id);
        if (!company)
            throw ApiError_1.ApiError.notFound('Company not found');
        const sites = await Site_1.Site.find({ companyId: id })
            .select('siteCode siteName location status agreedManpower actualManpower client')
            .sort({ siteName: 1 });
        return { company, sites };
    }
    /** Auto code: CMP-0001 — skips codes already taken (safe under races). */
    static async nextCode() {
        let n = (await Company_1.Company.countDocuments()) + 1;
        let code = `CMP-${String(n).padStart(4, '0')}`;
        while (await Company_1.Company.exists({ code })) {
            n += 1;
            code = `CMP-${String(n).padStart(4, '0')}`;
        }
        return code;
    }
    static validateAgreementDates(data) {
        if (data.agreementStartDate && data.agreementEndDate) {
            const start = new Date(data.agreementStartDate);
            const end = new Date(data.agreementEndDate);
            if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
                throw ApiError_1.ApiError.badRequest('Agreement end date must be on or after start date');
            }
        }
    }
    static async create(data, auditCtx) {
        const name = String(data.name || '').trim();
        if (!name)
            throw ApiError_1.ApiError.badRequest('Company name is required');
        CompanyService.validateAgreementDates(data);
        const existing = await Company_1.Company.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
        if (existing)
            throw ApiError_1.ApiError.conflict('Company already exists');
        const code = await CompanyService.nextCode();
        const company = await Company_1.Company.create({ ...data, name, code });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'COMPANY_CREATE',
                entity: 'Company',
                entityId: company._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.company.created', { companyId: company._id, code: company.code });
        return company;
    }
    static async update(id, data, auditCtx) {
        const old = await Company_1.Company.findById(id);
        if (!old)
            throw ApiError_1.ApiError.notFound('Company not found');
        CompanyService.validateAgreementDates(data);
        if (data.name && data.name !== old.name) {
            const existing = await Company_1.Company.findOne({
                name: new RegExp(`^${escapeRegex(data.name)}$`, 'i'),
                _id: { $ne: id },
            });
            if (existing)
                throw ApiError_1.ApiError.conflict('Company already exists');
        }
        const update = { ...data };
        delete update.code; // immutable once assigned
        // Reactivating from INACTIVE clears the deactivation stamp
        const wasInactive = old.status === types_1.CompanyStatus.INACTIVE;
        const willReactivate = wasInactive && !!data.status && data.status !== types_1.CompanyStatus.INACTIVE;
        if (willReactivate)
            update.$unset = { deactivatedAt: 1 };
        const company = await Company_1.Company.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        if (!company)
            throw ApiError_1.ApiError.notFound('Company not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'COMPANY_UPDATE',
                entity: 'Company',
                entityId: id,
                oldValues: {
                    name: old.name,
                    status: old.status,
                    paymentPrice: old.paymentPrice,
                    defaultOtPrice: old.defaultOtPrice,
                },
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.company.updated', { companyId: id });
        return company;
    }
    /** Soft-deactivate: keeps sites/employees/history attached to the record. */
    static async delete(id, auditCtx) {
        const company = await Company_1.Company.findById(id);
        if (!company)
            throw ApiError_1.ApiError.notFound('Company not found');
        if (company.status === types_1.CompanyStatus.INACTIVE)
            throw ApiError_1.ApiError.badRequest('Company is already inactive');
        const now = new Date();
        company.status = types_1.CompanyStatus.INACTIVE;
        company.deactivatedAt = now;
        await company.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'COMPANY_DEACTIVATE',
                entity: 'Company',
                entityId: id,
                oldValues: { status: types_1.CompanyStatus.ACTIVE },
                newValues: { status: types_1.CompanyStatus.INACTIVE, deactivatedAt: now.toISOString() },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.company.deactivated', { companyId: id, deactivatedAt: now });
    }
}
exports.CompanyService = CompanyService;
//# sourceMappingURL=company.service.js.map