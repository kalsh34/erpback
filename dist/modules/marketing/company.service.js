"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaCompanyService = void 0;
const mongoose_1 = require("mongoose");
const ProformaCompany_1 = require("../../models/ProformaCompany");
const ProformaSite_1 = require("../../models/ProformaSite");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const AuditLog_1 = require("../../models/AuditLog");
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ethiopian numbers (+251…, 09…, 011…) plus separators — format is preferred, not enforced. */
const PHONE_RX = /^\+?[\d()\-\s]{7,25}$/;
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
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
function optionalEmail(value, label) {
    const s = text(value, label, 320).toLowerCase();
    if (s && !EMAIL_RX.test(s))
        throw ApiError_1.ApiError.badRequest(`${label} must be a valid email address`);
    return s;
}
function requiredEmail(value, label) {
    const s = optionalEmail(value, label);
    if (!s)
        throw ApiError_1.ApiError.badRequest(`${label} is required`);
    return s;
}
function optionalPhone(value, label) {
    const s = text(value, label, 32);
    if (s && !PHONE_RX.test(s))
        throw ApiError_1.ApiError.badRequest(`${label} must be a valid phone number`);
    return s;
}
function requiredPhone(value, label) {
    const s = optionalPhone(value, label);
    if (!s)
        throw ApiError_1.ApiError.badRequest(`${label} is required`);
    return s;
}
function bool(value, fallback = false) {
    if (value === undefined || value === null || value === '')
        return fallback;
    return value === true || value === 'true';
}
/** Normalize + validate the contacts block; exactly one contact is marked primary. */
function normalizeContacts(raw) {
    if (raw === undefined || raw === null || raw === '')
        return [];
    if (!Array.isArray(raw))
        throw ApiError_1.ApiError.badRequest('contacts must be an array of contact persons');
    const rows = raw.map((entry, i) => {
        const row = (entry ?? {});
        return {
            fullName: requiredText(row.fullName, `contacts[${i}].fullName`, 200),
            position: text(row.position, `contacts[${i}].position`, 120),
            phone: optionalPhone(row.phone, `contacts[${i}].phone`),
            email: optionalEmail(row.email, `contacts[${i}].email`),
            isPrimary: bool(row.isPrimary),
        };
    });
    if (!rows.length)
        return rows;
    const firstPrimary = rows.findIndex((r) => r.isPrimary);
    const primaryIndex = firstPrimary === -1 ? 0 : firstPrimary;
    return rows.map((r, i) => ({ ...r, isPrimary: i === primaryIndex }));
}
/**
 * Validate + normalize a company payload. On update, absent fields are taken
 * from the existing document so a partial request can never blank out a
 * required business field.
 */
function normalizeCompany(input, existing) {
    const pick = (key) => (input[key] !== undefined ? input[key] : existing?.[key]);
    const name = requiredText(pick('name'), 'Company name (English)');
    const tin = requiredText(pick('tin'), 'TIN', 64).toUpperCase();
    const companyType = text(pick('companyType'), 'Company type', 40) || ProformaCompany_1.CompanyKind.PRIVATE_LIMITED;
    if (!Object.values(ProformaCompany_1.CompanyKind).includes(companyType)) {
        throw ApiError_1.ApiError.badRequest(`companyType must be one of: ${Object.values(ProformaCompany_1.CompanyKind).join(', ')}`);
    }
    const status = text(pick('status'), 'Status', 20) || types_1.CompanyStatus.ACTIVE;
    if (!Object.values(types_1.CompanyStatus).includes(status)) {
        throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(types_1.CompanyStatus).join(', ')}`);
    }
    return {
        name,
        nameAm: text(pick('nameAm'), 'Company name (Amharic)', 300),
        tin,
        registrationNumber: text(pick('registrationNumber'), 'Business registration number', 80),
        companyType,
        industry: text(pick('industry'), 'Industry', 120),
        address: requiredText(pick('address'), 'Head office address', 400),
        city: requiredText(pick('city'), 'City', 120),
        region: text(pick('region'), 'Region', 120),
        country: text(pick('country'), 'Country', 120) || 'Ethiopia',
        primaryPhone: requiredPhone(pick('primaryPhone'), 'Primary phone'),
        secondaryPhone: optionalPhone(pick('secondaryPhone'), 'Secondary phone'),
        primaryEmail: requiredEmail(pick('primaryEmail'), 'Primary email'),
        website: text(pick('website'), 'Website', 200),
        status,
        contacts: input.contacts !== undefined ? normalizeContacts(input.contacts) : (existing?.contacts ?? []),
    };
}
class ProformaCompanyService {
    static async getAll(options) {
        const page = options.page && options.page > 0 ? options.page : 1;
        const limit = options.limit ? Math.min(options.limit, 100) : 20;
        const skip = (page - 1) * limit;
        const filter = {};
        if (options.status && options.status !== 'ALL') {
            if (!Object.values(types_1.CompanyStatus).includes(options.status)) {
                throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(types_1.CompanyStatus).join(', ')}, ALL`);
            }
            filter.status = options.status;
        }
        if (options.search) {
            const rx = new RegExp(escapeRegex(options.search), 'i');
            filter.$or = [{ name: rx }, { nameAm: rx }, { tin: rx }, { city: rx }, { primaryPhone: rx }, { primaryEmail: rx }, { industry: rx }];
        }
        const sortField = ['name', 'tin', 'city', 'status', 'createdAt'].includes(options.sort || '')
            ? options.sort
            : 'name';
        const dir = options.dir === 'desc' ? -1 : 1;
        const [docs, total] = await Promise.all([
            ProformaCompany_1.ProformaCompany.find(filter).sort({ [sortField]: dir }).skip(skip).limit(limit),
            ProformaCompany_1.ProformaCompany.countDocuments(filter),
        ]);
        const ids = docs.map((d) => d._id);
        const siteRows = ids.length
            ? await ProformaSite_1.ProformaSite.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }])
            : [];
        const siteCount = new Map(siteRows.map((r) => [String(r._id), r.count]));
        return {
            data: docs.map((d) => ({ ...d.toObject(), siteCount: siteCount.get(String(d._id)) ?? 0 })),
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
    }
    static async getById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            throw ApiError_1.ApiError.badRequest('Invalid company id');
        const company = await ProformaCompany_1.ProformaCompany.findById(id);
        if (!company)
            throw ApiError_1.ApiError.notFound('Company not found');
        return company;
    }
    static async getDetail(id) {
        const company = await ProformaCompanyService.getById(id);
        const sites = await ProformaSite_1.ProformaSite.find({ companyId: company._id }).sort({ siteName: 1 });
        return { company, sites };
    }
    static async create(input, ctx) {
        const data = normalizeCompany(input);
        const existing = await ProformaCompany_1.ProformaCompany.findOne({ tin: data.tin });
        if (existing)
            throw ApiError_1.ApiError.conflict(`A company with TIN ${data.tin} is already registered`);
        const company = await ProformaCompany_1.ProformaCompany.create(data);
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'PROFORMA_COMPANY_CREATE',
                entity: 'ProformaCompany',
                entityId: company._id,
                newValues: data,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return company;
    }
    static async update(id, input, ctx) {
        const company = await ProformaCompanyService.getById(id);
        const oldValues = company.toObject();
        const data = normalizeCompany(input, company);
        if (data.tin !== company.tin) {
            const duplicate = await ProformaCompany_1.ProformaCompany.findOne({ tin: data.tin, _id: { $ne: company._id } });
            if (duplicate)
                throw ApiError_1.ApiError.conflict(`A company with TIN ${data.tin} is already registered`);
        }
        Object.assign(company, data);
        company.deactivatedAt = data.status === types_1.CompanyStatus.INACTIVE ? (company.deactivatedAt ?? new Date()) : null;
        await company.save();
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'PROFORMA_COMPANY_UPDATE',
                entity: 'ProformaCompany',
                entityId: company._id,
                oldValues,
                newValues: data,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return company;
    }
    /** Soft deactivate — issued proformas keep pointing at the company. */
    static async deactivate(id, ctx) {
        const company = await ProformaCompanyService.getById(id);
        if (company.status === types_1.CompanyStatus.INACTIVE)
            throw ApiError_1.ApiError.badRequest('Company is already inactive');
        company.status = types_1.CompanyStatus.INACTIVE;
        company.deactivatedAt = new Date();
        await company.save();
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'PROFORMA_COMPANY_DEACTIVATE',
                entity: 'ProformaCompany',
                entityId: company._id,
                oldValues: { status: types_1.CompanyStatus.ACTIVE },
                newValues: { status: company.status },
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return company;
    }
}
exports.ProformaCompanyService = ProformaCompanyService;
//# sourceMappingURL=company.service.js.map