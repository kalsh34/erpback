import { Types } from 'mongoose';
import { ProformaSite } from '../../models/ProformaSite';
import { ProformaCompany } from '../../models/ProformaCompany';
import { CompanyStatus } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditLog } from '../../models/AuditLog';
import type { MarketingCtx } from './company.service';

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

/**
 * Client sites. A site always belongs to a registered company and can only be
 * quoted while both it and its company are ACTIVE.
 */
export class ProformaSiteService {
  static async getAll(options: { companyId?: string; search?: string; status?: string; activeOnly?: string }) {
    const filter: Record<string, any> = {};
    if (options.companyId) {
      if (!Types.ObjectId.isValid(options.companyId)) throw ApiError.badRequest('companyId must be a valid company id');
      filter.companyId = new Types.ObjectId(options.companyId);
    }
    if (options.status && options.status !== 'ALL') {
      if (!Object.values(CompanyStatus).includes(options.status as CompanyStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(CompanyStatus).join(', ')}, ALL`);
      }
      filter.status = options.status;
    } else if (options.activeOnly === 'true') {
      filter.status = CompanyStatus.ACTIVE;
    }
    if (options.search) {
      const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ siteName: rx }, { city: rx }, { address: rx }];
    }
    const sites = await ProformaSite.find(filter).sort({ siteName: 1 });
    return { data: sites };
  }

  static async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid site id');
    const site = await ProformaSite.findById(id);
    if (!site) throw ApiError.notFound('Site not found');
    return site;
  }

  static async create(input: Record<string, any>, ctx: MarketingCtx) {
    const companyId = requiredText(input.companyId, 'companyId', 64);
    if (!Types.ObjectId.isValid(companyId)) throw ApiError.badRequest('companyId must be a valid company id');
    const company = await ProformaCompany.findById(companyId);
    if (!company) throw ApiError.badRequest('The selected company is not registered');
    if (company.status !== CompanyStatus.ACTIVE) {
      throw ApiError.badRequest('Sites can only be added to an active company');
    }

    const data = {
      companyId: new Types.ObjectId(companyId),
      siteName: requiredText(input.siteName, 'Site name', 200),
      address: text(input.address, 'Site address', 400),
      city: text(input.city, 'City', 120) || company.city,
      region: text(input.region, 'Region', 120) || company.region,
      specialRequirements: text(input.specialRequirements, 'Special requirements', 2000),
      status: CompanyStatus.ACTIVE,
    };

    const site = await ProformaSite.create(data);
    if (ctx.userId) {
      await AuditLog.create({
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

  static async update(id: string, input: Record<string, any>, ctx: MarketingCtx) {
    const site = await ProformaSiteService.getById(id);
    const oldValues = site.toObject();

    if (input.siteName !== undefined) site.siteName = requiredText(input.siteName, 'Site name', 200);
    if (input.address !== undefined) site.address = text(input.address, 'Site address', 400);
    if (input.city !== undefined) site.city = text(input.city, 'City', 120);
    if (input.region !== undefined) site.region = text(input.region, 'Region', 120);
    if (input.specialRequirements !== undefined) {
      site.specialRequirements = text(input.specialRequirements, 'Special requirements', 2000);
    }
    if (input.status !== undefined) {
      if (!Object.values(CompanyStatus).includes(input.status as CompanyStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(CompanyStatus).join(', ')}`);
      }
      site.status = input.status as CompanyStatus;
    }
    await site.save();

    if (ctx.userId) {
      await AuditLog.create({
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
