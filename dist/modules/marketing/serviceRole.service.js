"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRoleService = void 0;
const mongoose_1 = require("mongoose");
const ServiceRole_1 = require("../../models/ServiceRole");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const AuditLog_1 = require("../../models/AuditLog");
const ROLE_CODE_RX = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;
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
function enumValue(input, values, label, fallback) {
    if (input === undefined || input === null || input === '') {
        if (fallback !== undefined)
            return fallback;
        throw ApiError_1.ApiError.badRequest(`${label} is required`);
    }
    const s = String(input).toUpperCase();
    if (!Object.values(values).includes(s)) {
        throw ApiError_1.ApiError.badRequest(`${label} must be one of: ${Object.values(values).join(', ')}`);
    }
    return s;
}
function nonNegative(value, label) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0)
        throw ApiError_1.ApiError.badRequest(`${label} must be a non-negative number`);
    return n;
}
/**
 * SERVICE ROLE catalog. Required on create (per the module spec): role code,
 * role name, default monthly rate, shift pattern and multiplier. Only ACTIVE
 * roles are offered when composing a proforma.
 */
class ServiceRoleService {
    static async getAll(options) {
        const filter = {};
        if (options.status && options.status !== 'ALL') {
            if (!Object.values(types_1.CompanyStatus).includes(options.status)) {
                throw ApiError_1.ApiError.badRequest(`status must be one of: ${Object.values(types_1.CompanyStatus).join(', ')}, ALL`);
            }
            filter.status = options.status;
        }
        else if (options.activeOnly === 'true') {
            filter.status = types_1.CompanyStatus.ACTIVE;
        }
        if (options.category) {
            if (!Object.values(ServiceRole_1.RoleCategory).includes(options.category)) {
                throw ApiError_1.ApiError.badRequest(`category must be one of: ${Object.values(ServiceRole_1.RoleCategory).join(', ')}`);
            }
            filter.category = options.category;
        }
        if (options.search) {
            const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ roleCode: rx }, { roleName: rx }, { description: rx }];
        }
        const roles = await ServiceRole_1.ServiceRole.find(filter).sort({ roleCode: 1 });
        return { data: roles };
    }
    static async getById(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id))
            throw ApiError_1.ApiError.badRequest('Invalid service role id');
        const role = await ServiceRole_1.ServiceRole.findById(id);
        if (!role)
            throw ApiError_1.ApiError.notFound('Service role not found');
        return role;
    }
    static async create(input, ctx) {
        const roleCode = requiredText(input.roleCode, 'Role code', 32).toUpperCase();
        if (!ROLE_CODE_RX.test(roleCode)) {
            throw ApiError_1.ApiError.badRequest('Role code must be 1-32 chars of A-Z, 0-9 and . _ / -');
        }
        if (await ServiceRole_1.ServiceRole.exists({ roleCode })) {
            throw ApiError_1.ApiError.conflict(`A service role with code ${roleCode} already exists`);
        }
        const multiplier = input.multiplier === undefined || input.multiplier === '' ? 3 : Number(input.multiplier);
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            throw ApiError_1.ApiError.badRequest('Multiplier must be a positive number');
        }
        const data = {
            roleCode,
            roleName: requiredText(input.roleName, 'Role name', 200),
            gender: enumValue(input.gender, ServiceRole_1.RoleGender, 'Gender', ServiceRole_1.RoleGender.UNISEX),
            category: enumValue(input.category, ServiceRole_1.RoleCategory, 'Category', ServiceRole_1.RoleCategory.MANPOWER),
            description: text(input.description, 'Description', 2000),
            defaultMonthlyRate: nonNegative(input.defaultMonthlyRate, 'Default monthly rate'),
            rateType: enumValue(input.rateType, ServiceRole_1.RateType, 'Rate type', ServiceRole_1.RateType.MONTHLY),
            vatApplicable: input.vatApplicable === undefined ? true : input.vatApplicable === true || input.vatApplicable === 'true',
            allowRateOverride: input.allowRateOverride === true || input.allowRateOverride === 'true',
            shiftPattern: enumValue(input.shiftPattern, ServiceRole_1.ShiftPattern, 'Shift pattern', ServiceRole_1.ShiftPattern.CONTINUOUS_24_48),
            multiplier,
            restDaysRule: text(input.restDaysRule, 'Rest days rule', 500),
            status: enumValue(input.status, types_1.CompanyStatus, 'Status', types_1.CompanyStatus.ACTIVE),
        };
        const role = await ServiceRole_1.ServiceRole.create(data);
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'SERVICE_ROLE_CREATE',
                entity: 'ServiceRole',
                entityId: role._id,
                newValues: data,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return role;
    }
    static async update(id, input, ctx) {
        const role = await ServiceRoleService.getById(id);
        const oldValues = role.toObject();
        if (input.roleCode !== undefined) {
            const roleCode = requiredText(input.roleCode, 'Role code', 32).toUpperCase();
            if (!ROLE_CODE_RX.test(roleCode)) {
                throw ApiError_1.ApiError.badRequest('Role code must be 1-32 chars of A-Z, 0-9 and . _ / -');
            }
            if (roleCode !== role.roleCode && (await ServiceRole_1.ServiceRole.exists({ roleCode, _id: { $ne: role._id } }))) {
                throw ApiError_1.ApiError.conflict(`A service role with code ${roleCode} already exists`);
            }
            role.roleCode = roleCode;
        }
        if (input.roleName !== undefined)
            role.roleName = requiredText(input.roleName, 'Role name', 200);
        if (input.gender !== undefined)
            role.gender = enumValue(input.gender, ServiceRole_1.RoleGender, 'Gender');
        if (input.category !== undefined)
            role.category = enumValue(input.category, ServiceRole_1.RoleCategory, 'Category');
        if (input.description !== undefined)
            role.description = text(input.description, 'Description', 2000);
        if (input.defaultMonthlyRate !== undefined) {
            role.defaultMonthlyRate = nonNegative(input.defaultMonthlyRate, 'Default monthly rate');
        }
        if (input.rateType !== undefined)
            role.rateType = enumValue(input.rateType, ServiceRole_1.RateType, 'Rate type');
        if (input.vatApplicable !== undefined) {
            role.vatApplicable = input.vatApplicable === true || input.vatApplicable === 'true';
        }
        if (input.allowRateOverride !== undefined) {
            role.allowRateOverride = input.allowRateOverride === true || input.allowRateOverride === 'true';
        }
        if (input.shiftPattern !== undefined) {
            role.shiftPattern = enumValue(input.shiftPattern, ServiceRole_1.ShiftPattern, 'Shift pattern');
        }
        if (input.multiplier !== undefined) {
            const multiplier = Number(input.multiplier);
            if (!Number.isFinite(multiplier) || multiplier <= 0) {
                throw ApiError_1.ApiError.badRequest('Multiplier must be a positive number');
            }
            role.multiplier = multiplier;
        }
        if (input.restDaysRule !== undefined)
            role.restDaysRule = text(input.restDaysRule, 'Rest days rule', 500);
        if (input.status !== undefined)
            role.status = enumValue(input.status, types_1.CompanyStatus, 'Status');
        await role.save();
        if (ctx.userId) {
            await AuditLog_1.AuditLog.create({
                userId: ctx.userId,
                action: 'SERVICE_ROLE_UPDATE',
                entity: 'ServiceRole',
                entityId: role._id,
                oldValues,
                newValues: input,
                ipAddress: ctx.ip,
                userAgent: ctx.ua,
            });
        }
        return role;
    }
}
exports.ServiceRoleService = ServiceRoleService;
//# sourceMappingURL=serviceRole.service.js.map