import { Company, ICompany } from '../../../models/Company';
import { CompanyStatus } from '../../../types';
import { Site } from '../../../models/Site';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

type AuditCtx = { userId: string; ip?: string; ua?: string };

/** Server-side sortable columns (the ⇅ headers in the company table). */
const SORTABLE: Record<string, string> = {
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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CompanyService {
  static async getAll(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    dir?: string;
  }) {
    const { page = 1, limit = 20, status, search, sort = 'name', dir = 'asc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
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
      Company.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit),
      Company.countDocuments(filter),
    ]);

    // Derived columns: Sites = sites owned by the company,
    // Employees = staff linked directly (companyId) or deployed at one of its sites (homeSiteId).
    const siteCountByCompany = new Map<string, number>();
    const employeeCountByCompany = new Map<string, number>();

    const ids = companies.map((c) => c._id);
    if (ids.length > 0) {
      const [siteRows, companySiteRows] = await Promise.all([
        Site.aggregate([{ $match: { companyId: { $in: ids } } }, { $group: { _id: '$companyId', count: { $sum: 1 } } }]),
        Site.find({ companyId: { $in: ids } }).select('_id companyId').lean(),
      ]);
      for (const row of siteRows) siteCountByCompany.set(String(row._id), row.count);

      const siteToCompany = new Map<string, string>(
        companySiteRows.map((s: any) => [String(s._id), String(s.companyId)])
      );
      const siteIds = companySiteRows.map((s: any) => s._id);
      const employeeRows = await Employee.find({
        $or: [
          { companyId: { $in: ids } },
          ...(siteIds.length > 0 ? [{ homeSiteId: { $in: siteIds } }] : []),
        ],
      })
        .select('companyId homeSiteId')
        .lean();

      const idSet = new Set(ids.map(String));
      for (const emp of employeeRows as any[]) {
        let owner = emp.companyId ? String(emp.companyId) : null;
        if (!owner && emp.homeSiteId) owner = siteToCompany.get(String(emp.homeSiteId)) || null;
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

  static async getById(id: string): Promise<ICompany> {
    const company = await Company.findById(id);
    if (!company) throw ApiError.notFound('Company not found');
    return company;
  }

  /** Company + its sites (Name link / View action opens this). */
  static async getDetail(id: string) {
    const company = await Company.findById(id);
    if (!company) throw ApiError.notFound('Company not found');
    const sites = await Site.find({ companyId: id })
      .select('siteCode siteName location status agreedManpower actualManpower client')
      .sort({ siteName: 1 });
    return { company, sites };
  }

  /** Auto code: CMP-0001 — skips codes already taken (safe under races). */
  private static async nextCode(): Promise<string> {
    let n = (await Company.countDocuments()) + 1;
    let code = `CMP-${String(n).padStart(4, '0')}`;
    while (await Company.exists({ code })) {
      n += 1;
      code = `CMP-${String(n).padStart(4, '0')}`;
    }
    return code;
  }

  private static validateAgreementDates(data: { agreementStartDate?: any; agreementEndDate?: any }) {
    if (data.agreementStartDate && data.agreementEndDate) {
      const start = new Date(data.agreementStartDate);
      const end = new Date(data.agreementEndDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        throw ApiError.badRequest('Agreement end date must be on or after start date');
      }
    }
  }

  static async create(data: Partial<ICompany>, auditCtx?: AuditCtx): Promise<ICompany> {
    const name = String(data.name || '').trim();
    if (!name) throw ApiError.badRequest('Company name is required');
    CompanyService.validateAgreementDates(data);

    const existing = await Company.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, 'i') });
    if (existing) throw ApiError.conflict('Company already exists');

    const code = await CompanyService.nextCode();
    const company = await Company.create({ ...data, name, code });

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'COMPANY_CREATE',
        entity: 'Company',
        entityId: (company._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.company.created', { companyId: company._id, code: company.code });

    return company;
  }

  static async update(id: string, data: Partial<ICompany>, auditCtx?: AuditCtx): Promise<ICompany> {
    const old = await Company.findById(id);
    if (!old) throw ApiError.notFound('Company not found');
    CompanyService.validateAgreementDates(data);

    if (data.name && data.name !== old.name) {
      const existing = await Company.findOne({
        name: new RegExp(`^${escapeRegex(data.name)}$`, 'i'),
        _id: { $ne: id },
      });
      if (existing) throw ApiError.conflict('Company already exists');
    }

    const update: any = { ...data };
    delete update.code; // immutable once assigned

    // Reactivating from INACTIVE clears the deactivation stamp
    const wasInactive = old.status === CompanyStatus.INACTIVE;
    const willReactivate = wasInactive && !!data.status && data.status !== CompanyStatus.INACTIVE;
    if (willReactivate) update.$unset = { deactivatedAt: 1 };

    const company = await Company.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!company) throw ApiError.notFound('Company not found');

    if (auditCtx) {
      AuditService.log({
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
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.company.updated', { companyId: id });

    return company;
  }

  /** Soft-deactivate: keeps sites/employees/history attached to the record. */
  static async delete(id: string, auditCtx?: AuditCtx): Promise<void> {
    const company = await Company.findById(id);
    if (!company) throw ApiError.notFound('Company not found');
    if (company.status === CompanyStatus.INACTIVE) throw ApiError.badRequest('Company is already inactive');

    const now = new Date();
    company.status = CompanyStatus.INACTIVE;
    company.deactivatedAt = now;
    await company.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'COMPANY_DEACTIVATE',
        entity: 'Company',
        entityId: id,
        oldValues: { status: CompanyStatus.ACTIVE },
        newValues: { status: CompanyStatus.INACTIVE, deactivatedAt: now.toISOString() },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.company.deactivated', { companyId: id, deactivatedAt: now });
  }
}
