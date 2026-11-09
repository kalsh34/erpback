import { Types } from 'mongoose';
import { ProformaCompany, IProformaCompany, ICompanyContact, CompanyKind } from '../../models/ProformaCompany';
import { ProformaSite } from '../../models/ProformaSite';
import { CompanyStatus } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditLog } from '../../models/AuditLog';

/** Request context used for the audit trail (user + origin). */
export interface MarketingCtx {
  userId?: string;
  ip?: string;
  ua?: string;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Ethiopian numbers (+251…, 09…, 011…) plus separators — format is preferred, not enforced. */
const PHONE_RX = /^\+?[\d()\-\s]{7,25}$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

function optionalEmail(value: unknown, label: string): string {
  const s = text(value, label, 320).toLowerCase();
  if (s && !EMAIL_RX.test(s)) throw ApiError.badRequest(`${label} must be a valid email address`);
  return s;
}

function requiredEmail(value: unknown, label: string): string {
  const s = optionalEmail(value, label);
  if (!s) throw ApiError.badRequest(`${label} is required`);
  return s;
}

function optionalPhone(value: unknown, label: string): string {
  const s = text(value, label, 32);
  if (s && !PHONE_RX.test(s)) throw ApiError.badRequest(`${label} must be a valid phone number`);
  return s;
}

function requiredPhone(value: unknown, label: string): string {
  const s = optionalPhone(value, label);
  if (!s) throw ApiError.badRequest(`${label} is required`);
  return s;
}

function bool(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true';
}

/** Normalize + validate the contacts block; exactly one contact is marked primary. */
function normalizeContacts(raw: unknown): ICompanyContact[] {
  if (raw === undefined || raw === null || raw === '') return [];
  if (!Array.isArray(raw)) throw ApiError.badRequest('contacts must be an array of contact persons');
  const rows = raw.map((entry, i) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    return {
      fullName: requiredText(row.fullName, `contacts[${i}].fullName`, 200),
      position: text(row.position, `contacts[${i}].position`, 120),
      phone: optionalPhone(row.phone, `contacts[${i}].phone`),
      email: optionalEmail(row.email, `contacts[${i}].email`),
      isPrimary: bool(row.isPrimary),
    } as ICompanyContact;
  });
  if (!rows.length) return rows;
  const firstPrimary = rows.findIndex((r) => r.isPrimary);
  const primaryIndex = firstPrimary === -1 ? 0 : firstPrimary;
  return rows.map((r, i) => ({ ...r, isPrimary: i === primaryIndex }));
}

/**
 * Validate + normalize a company payload. On update, absent fields are taken
 * from the existing document so a partial request can never blank out a
 * required business field.
 */
function normalizeCompany(input: Record<string, any>, existing?: IProformaCompany) {
  const pick = (key: string) => (input[key] !== undefined ? input[key] : (existing as any)?.[key]);

  const name = requiredText(pick('name'), 'Company name (English)');
  const tin = requiredText(pick('tin'), 'TIN', 64).toUpperCase();
  const companyType = text(pick('companyType'), 'Company type', 40) || CompanyKind.PRIVATE_LIMITED;
  if (!Object.values(CompanyKind).includes(companyType as CompanyKind)) {
    throw ApiError.badRequest(`companyType must be one of: ${Object.values(CompanyKind).join(', ')}`);
  }

  const status = text(pick('status'), 'Status', 20) || CompanyStatus.ACTIVE;
  if (!Object.values(CompanyStatus).includes(status as CompanyStatus)) {
    throw ApiError.badRequest(`status must be one of: ${Object.values(CompanyStatus).join(', ')}`);
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

export class ProformaCompanyService {
  static async getAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit ? Math.min(options.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (options.status && options.status !== 'ALL') {
      if (!Object.values(CompanyStatus).includes(options.status as CompanyStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(CompanyStatus).join(', ')}, ALL`);
      }
      filter.status = options.status;
    }
    if (options.search) {
      const rx = new RegExp(escapeRegex(options.search), 'i');
      filter.$or = [{ name: rx }, { nameAm: rx }, { tin: rx }, { city: rx }, { primaryPhone: rx }, { primaryEmail: rx }, { industry: rx }];
    }

    const sortField = ['name', 'tin', 'city', 'status', 'createdAt'].includes(options.sort || '')
      ? options.sort!
      : 'name';
    const dir = options.dir === 'desc' ? -1 : 1;

    const [docs, total] = await Promise.all([
      ProformaCompany.find(filter).sort({ [sortField]: dir }).skip(skip).limit(limit),
      ProformaCompany.countDocuments(filter),
    ]);

    const ids = docs.map((d) => d._id);
    const siteRows = ids.length
      ? await ProformaSite.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }])
      : [];
    const siteCount = new Map<string, number>(siteRows.map((r: any) => [String(r._id), r.count]));

    return {
      data: docs.map((d) => ({ ...d.toObject(), siteCount: siteCount.get(String(d._id)) ?? 0 })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  static async getById(id: string): Promise<IProformaCompany> {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid company id');
    const company = await ProformaCompany.findById(id);
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  static async getDetail(id: string) {
    const company = await ProformaCompanyService.getById(id);
    const sites = await ProformaSite.find({ companyId: company._id }).sort({ siteName: 1 });
    return { company, sites };
  }

  static async create(input: Record<string, any>, ctx: MarketingCtx) {
    const data = normalizeCompany(input);

    const existing = await ProformaCompany.findOne({ tin: data.tin });
    if (existing) throw ApiError.conflict(`A company with TIN ${data.tin} is already registered`);

    const company = await ProformaCompany.create(data);

    if (ctx.userId) {
      await AuditLog.create({
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

  static async update(id: string, input: Record<string, any>, ctx: MarketingCtx) {
    const company = await ProformaCompanyService.getById(id);
    const oldValues = company.toObject();
    const data = normalizeCompany(input, company);

    if (data.tin !== company.tin) {
      const duplicate = await ProformaCompany.findOne({ tin: data.tin, _id: { $ne: company._id } });
      if (duplicate) throw ApiError.conflict(`A company with TIN ${data.tin} is already registered`);
    }

    Object.assign(company, data);
    company.deactivatedAt = data.status === CompanyStatus.INACTIVE ? (company.deactivatedAt ?? new Date()) : null;
    await company.save();

    if (ctx.userId) {
      await AuditLog.create({
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
  static async deactivate(id: string, ctx: MarketingCtx) {
    const company = await ProformaCompanyService.getById(id);
    if (company.status === CompanyStatus.INACTIVE) throw ApiError.badRequest('Company is already inactive');
    company.status = CompanyStatus.INACTIVE;
    company.deactivatedAt = new Date();
    await company.save();

    if (ctx.userId) {
      await AuditLog.create({
        userId: ctx.userId,
        action: 'PROFORMA_COMPANY_DEACTIVATE',
        entity: 'ProformaCompany',
        entityId: company._id,
        oldValues: { status: CompanyStatus.ACTIVE },
        newValues: { status: company.status },
        ipAddress: ctx.ip,
        userAgent: ctx.ua,
      });
    }
    return company;
  }
}
