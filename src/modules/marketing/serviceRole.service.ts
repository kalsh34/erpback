import { Types } from 'mongoose';
import { ServiceRole, IServiceRole, RoleGender, RoleCategory, RateType, ShiftPattern } from '../../models/ServiceRole';
import { CompanyStatus } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditLog } from '../../models/AuditLog';
import type { MarketingCtx } from './company.service';

const ROLE_CODE_RX = /^[A-Z0-9][A-Z0-9._/-]{0,31}$/;

function text(value: unknown, label: string, max = 300): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (s.length > max) throw ApiError.badRequest(`${label} must be at most ${max} characters`);
  return s;
}

function requiredText(value: unknown, label: string, max = 300): string {
  const s = text(value, label, max);
  if (!s) throw ApiError.badRequest(`${label} is required`);
  return s;
}

function enumValue<T extends Record<string, string>>(input: unknown, values: T, label: string, fallback?: string): string {
  if (input === undefined || input === null || input === '') {
    if (fallback !== undefined) return fallback;
    throw ApiError.badRequest(`${label} is required`);
  }
  const s = String(input).toUpperCase();
  if (!Object.values(values).includes(s)) {
    throw ApiError.badRequest(`${label} must be one of: ${Object.values(values).join(', ')}`);
  }
  return s;
}

function nonNegative(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw ApiError.badRequest(`${label} must be a non-negative number`);
  return n;
}

/**
 * SERVICE ROLE catalog. Required on create (per the module spec): role code,
 * role name, default monthly rate, shift pattern and multiplier. Only ACTIVE
 * roles are offered when composing a proforma.
 */
export class ServiceRoleService {
  static async getAll(options: { search?: string; status?: string; activeOnly?: string; category?: string }) {
    const filter: Record<string, any> = {};
    if (options.status && options.status !== 'ALL') {
      if (!Object.values(CompanyStatus).includes(options.status as CompanyStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(CompanyStatus).join(', ')}, ALL`);
      }
      filter.status = options.status;
    } else if (options.activeOnly === 'true') {
      filter.status = CompanyStatus.ACTIVE;
    }
    if (options.category) {
      if (!Object.values(RoleCategory).includes(options.category as RoleCategory)) {
        throw ApiError.badRequest(`category must be one of: ${Object.values(RoleCategory).join(', ')}`);
      }
      filter.category = options.category;
    }
    if (options.search) {
      const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ roleCode: rx }, { roleName: rx }, { description: rx }];
    }
    const roles = await ServiceRole.find(filter).sort({ roleCode: 1 });
    return { data: roles };
  }

  static async getById(id: string): Promise<IServiceRole> {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid service role id');
    const role = await ServiceRole.findById(id);
    if (!role) throw ApiError.notFound('Service role not found');
    return role;
  }

  static async create(input: Record<string, any>, ctx: MarketingCtx) {
    const roleCode = requiredText(input.roleCode, 'Role code', 32).toUpperCase();
    if (!ROLE_CODE_RX.test(roleCode)) {
      throw ApiError.badRequest('Role code must be 1-32 chars of A-Z, 0-9 and . _ / -');
    }
    if (await ServiceRole.exists({ roleCode })) {
      throw ApiError.conflict(`A service role with code ${roleCode} already exists`);
    }

    const multiplier = input.multiplier === undefined || input.multiplier === '' ? 3 : Number(input.multiplier);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw ApiError.badRequest('Multiplier must be a positive number');
    }

    const data = {
      roleCode,
      roleName: requiredText(input.roleName, 'Role name', 200),
      gender: enumValue(input.gender, RoleGender, 'Gender', RoleGender.UNISEX),
      category: enumValue(input.category, RoleCategory, 'Category', RoleCategory.MANPOWER),
      description: text(input.description, 'Description', 2000),
      defaultMonthlyRate: nonNegative(input.defaultMonthlyRate, 'Default monthly rate'),
      rateType: enumValue(input.rateType, RateType, 'Rate type', RateType.MONTHLY),
      vatApplicable: input.vatApplicable === undefined ? true : input.vatApplicable === true || input.vatApplicable === 'true',
      allowRateOverride: input.allowRateOverride === true || input.allowRateOverride === 'true',
      shiftPattern: enumValue(input.shiftPattern, ShiftPattern, 'Shift pattern', ShiftPattern.CONTINUOUS_24_48),
      multiplier,
      restDaysRule: text(input.restDaysRule, 'Rest days rule', 500),
      status: enumValue(input.status, CompanyStatus, 'Status', CompanyStatus.ACTIVE),
    };

    const role = await ServiceRole.create(data);
    if (ctx.userId) {
      await AuditLog.create({
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

  static async update(id: string, input: Record<string, any>, ctx: MarketingCtx) {
    const role = await ServiceRoleService.getById(id);
    const oldValues = role.toObject();

    if (input.roleCode !== undefined) {
      const roleCode = requiredText(input.roleCode, 'Role code', 32).toUpperCase();
      if (!ROLE_CODE_RX.test(roleCode)) {
        throw ApiError.badRequest('Role code must be 1-32 chars of A-Z, 0-9 and . _ / -');
      }
      if (roleCode !== role.roleCode && (await ServiceRole.exists({ roleCode, _id: { $ne: role._id } }))) {
        throw ApiError.conflict(`A service role with code ${roleCode} already exists`);
      }
      role.roleCode = roleCode;
    }
    if (input.roleName !== undefined) role.roleName = requiredText(input.roleName, 'Role name', 200);
    if (input.gender !== undefined) role.gender = enumValue(input.gender, RoleGender, 'Gender') as RoleGender;
    if (input.category !== undefined) role.category = enumValue(input.category, RoleCategory, 'Category') as RoleCategory;
    if (input.description !== undefined) role.description = text(input.description, 'Description', 2000);
    if (input.defaultMonthlyRate !== undefined) {
      role.defaultMonthlyRate = nonNegative(input.defaultMonthlyRate, 'Default monthly rate');
    }
    if (input.rateType !== undefined) role.rateType = enumValue(input.rateType, RateType, 'Rate type') as RateType;
    if (input.vatApplicable !== undefined) {
      role.vatApplicable = input.vatApplicable === true || input.vatApplicable === 'true';
    }
    if (input.allowRateOverride !== undefined) {
      role.allowRateOverride = input.allowRateOverride === true || input.allowRateOverride === 'true';
    }
    if (input.shiftPattern !== undefined) {
      role.shiftPattern = enumValue(input.shiftPattern, ShiftPattern, 'Shift pattern') as ShiftPattern;
    }
    if (input.multiplier !== undefined) {
      const multiplier = Number(input.multiplier);
      if (!Number.isFinite(multiplier) || multiplier <= 0) {
        throw ApiError.badRequest('Multiplier must be a positive number');
      }
      role.multiplier = multiplier;
    }
    if (input.restDaysRule !== undefined) role.restDaysRule = text(input.restDaysRule, 'Rest days rule', 500);
    if (input.status !== undefined) role.status = enumValue(input.status, CompanyStatus, 'Status') as CompanyStatus;

    await role.save();

    if (ctx.userId) {
      await AuditLog.create({
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
