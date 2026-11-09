import { Types } from 'mongoose';
import {
  Proforma,
  IProforma,
  IProformaItem,
  ProformaStatus,
  PROFORMA_TRANSITIONS,
  PROFORMA_VAT_RATE,
  PROFORMA_DEFAULT_VALIDITY_DAYS,
  computeItemValues,
  computeProformaTotals,
  addDays,
} from '../../models/Proforma';
import { ProformaSequence } from '../../models/ProformaSequence';
import { ProformaCompany } from '../../models/ProformaCompany';
import { ProformaSite } from '../../models/ProformaSite';
import { RoleCategory, ServiceRole, describeShiftPattern } from '../../models/ServiceRole';
import { CompanyStatus } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditLog } from '../../models/AuditLog';
import type { MarketingCtx } from './company.service';

const MAX_ITEMS = 50;

function text(value: unknown, label: string, max = 300): string {
  if (value === undefined || value === null) return '';
  const s = String(value).trim();
  if (s.length > max) throw ApiError.badRequest(`${label} must be at most ${max} characters`);
  return s;
}

function requiredId(value: unknown, label: string): string {
  const s = text(value, label, 64);
  if (!s) throw ApiError.badRequest(`${label} is required`);
  if (!Types.ObjectId.isValid(s)) throw ApiError.badRequest(`${label} must be a valid id`);
  return s;
}

/** Local-midnight calendar date (avoids UTC off-by-one on issue/validity dates). */
function toCalendarDate(value: unknown, label: string): Date {
  if (value === undefined || value === null || value === '') {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest(`${label} must be a valid date`);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function normalizeValidityDays(value: unknown): number {
  if (value === undefined || value === null || value === '') return PROFORMA_DEFAULT_VALIDITY_DAYS;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 365) {
    throw ApiError.badRequest('validityDays must be a whole number between 1 and 365');
  }
  return n;
}

/** Read-only totals recomputation safety: always derive from the items. */
function totalsOf(items: IProformaItem[]) {
  return computeProformaTotals(items, PROFORMA_VAT_RATE);
}

/** Auto-generated shift note (Step 3 of the issuing page), editable afterwards. */
export function buildShiftNote(items: IProformaItem[]): string {
  const isManpower = (it: IProformaItem) => !it.category || it.category === RoleCategory.MANPOWER;
  const rows = items.map((it) => {
    if (!isManpower(it)) {
      // Technology / specialised services are supplied as units, not posts.
      return `${it.roleName} — ${Number(it.totalHeadcount.toFixed(2))} unit${it.totalHeadcount === 1 ? '' : 's'} per month.`;
    }
    const pattern = describeShiftPattern(it.shiftPattern);
    const rest = it.restDaysRule ? ` ${it.restDaysRule}` : '';
    return `${it.roleName} — ${it.postsPerDay} post${it.postsPerDay === 1 ? '' : 's'} per day; ${pattern}.${rest}`;
  });
  const headcount = items.reduce((s, i) => s + (isManpower(i) ? i.totalHeadcount : 0), 0);
  return [
    ...rows,
    `Total headcount: ${Number(headcount.toFixed(2))} guard(s)/staff per month (posts per day × role multiplier).`,
    'Rates quoted are monthly and exclusive of VAT where VAT applies.',
  ].join('\n');
}

export class ProformaService {
  static async getAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    companyId?: string;
    from?: string;
    to?: string;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit ? Math.min(options.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (options.status && options.status !== 'ALL') {
      if (!Object.values(ProformaStatus).includes(options.status as ProformaStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(ProformaStatus).join(', ')}, ALL`);
      }
      filter.status = options.status;
    }
    if (options.companyId) {
      if (!Types.ObjectId.isValid(options.companyId)) throw ApiError.badRequest('companyId must be a valid company id');
      filter.companyId = new Types.ObjectId(options.companyId);
    }
    if (options.from || options.to) {
      filter.issueDate = {};
      if (options.from) {
        const from = new Date(options.from);
        if (Number.isNaN(from.getTime())) throw ApiError.badRequest('from must be a valid date');
        filter.issueDate.$gte = from;
      }
      if (options.to) {
        const to = new Date(options.to);
        if (Number.isNaN(to.getTime())) throw ApiError.badRequest('to must be a valid date');
        filter.issueDate.$lte = to;
      }
    }
    if (options.search) {
      const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ number: rx }, { 'items.roleName': rx }, { notes: rx }];
    }

    const [docs, total] = await Promise.all([
      Proforma.find(filter)
        .populate('companyId', 'name nameAm tin city primaryPhone primaryEmail status')
        .populate('siteId', 'siteName city address status')
        .sort({ issueDate: -1, number: -1 })
        .skip(skip)
        .limit(limit),
      Proforma.countDocuments(filter),
    ]);

    return { data: docs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  static async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid proforma id');
    const proforma = await Proforma.findById(id)
      .populate('companyId', 'name nameAm tin registrationNumber companyType industry address city region country primaryPhone secondaryPhone primaryEmail website status contacts')
      .populate('siteId', 'siteName address city region specialRequirements status');
    if (!proforma) throw ApiError.notFound('Proforma not found');
    return proforma;
  }

  /**
   * Validate + price the submitted lines. Headcount and line totals are always
   * recomputed here (rule 3): any client-supplied totalHeadcount/lineTotal is
   * ignored, and the rate may only differ from the catalog default when the
   * role allows overrides.
   */
  private static async resolveItems(rawItems: unknown): Promise<IProformaItem[]> {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw ApiError.badRequest('A proforma must quote at least one service line (items is required)');
    }
    if (rawItems.length > MAX_ITEMS) {
      throw ApiError.badRequest(`A proforma may quote at most ${MAX_ITEMS} lines`);
    }

    const ids = rawItems.map((row: any, i: number) => requiredId(row?.roleId, `items[${i}].roleId`));
    const roles = await ServiceRole.find({ _id: { $in: ids } });
    const byId = new Map(roles.map((r) => [String(r._id), r]));

    return rawItems.map((row: any, i: number) => {
      const role = byId.get(String(row.roleId));
      if (!role) throw ApiError.badRequest(`items[${i}] references an unknown service role`);
      if (role.status !== CompanyStatus.ACTIVE) {
        throw ApiError.badRequest(`items[${i}] references an inactive service role (${role.roleCode})`);
      }

      const postsPerDay = Number(row.postsPerDay);
      if (!Number.isInteger(postsPerDay) || postsPerDay < 1 || postsPerDay > 1000) {
        throw ApiError.badRequest(`items[${i}].postsPerDay must be a whole number between 1 and 1000`);
      }
      if (!(role.multiplier > 0)) {
        throw ApiError.badRequest(`Service role ${role.roleCode} has no valid multiplier`);
      }

      let unitRate = role.defaultMonthlyRate;
      if (row.unitRate !== undefined && row.unitRate !== null && row.unitRate !== '') {
        const requested = Number(row.unitRate);
        if (!Number.isFinite(requested) || requested < 0) {
          throw ApiError.badRequest(`items[${i}].unitRate must be a non-negative number`);
        }
        if (requested !== role.defaultMonthlyRate) {
          if (!role.allowRateOverride) {
            throw ApiError.badRequest(
              `items[${i}]: the rate for ${role.roleCode} is fixed at ${role.defaultMonthlyRate} (overrides are disabled on this role)`
            );
          }
          unitRate = requested;
        }
      }

      const { totalHeadcount, lineTotal } = computeItemValues(postsPerDay, role.multiplier, unitRate);

      return {
        roleId: role._id,
        roleCode: role.roleCode,
        roleName: role.roleName,
        gender: role.gender,
        category: role.category,
        postsPerDay,
        multiplier: role.multiplier,
        totalHeadcount,
        unitRate,
        lineTotal,
        vatApplicable: role.vatApplicable,
        shiftPattern: role.shiftPattern,
        restDaysRule: role.restDaysRule ?? '',
      } as IProformaItem;
    });
  }

  /** Rules 1 + site ownership: only an ACTIVE company and its ACTIVE site. */
  private static async resolveRecipient(companyIdRaw: unknown, siteIdRaw: unknown) {
    const companyId = requiredId(companyIdRaw, 'companyId');
    const siteId = requiredId(siteIdRaw, 'siteId');

    const company = await ProformaCompany.findById(companyId);
    if (!company) throw ApiError.badRequest('The selected company is not registered');
    if (company.status !== CompanyStatus.ACTIVE) {
      throw ApiError.badRequest('A proforma can only be created for an active company');
    }

    const site = await ProformaSite.findById(siteId);
    if (!site) throw ApiError.badRequest('The selected site does not exist');
    if (String(site.companyId) !== String(company._id)) {
      throw ApiError.badRequest('The selected site does not belong to the selected company');
    }
    if (site.status !== CompanyStatus.ACTIVE) {
      throw ApiError.badRequest('The selected site is inactive');
    }
    return { company, site };
  }

  static async create(input: Record<string, any>, ctx: MarketingCtx) {
    const { company, site } = await ProformaService.resolveRecipient(input.companyId, input.siteId);
    const items = await ProformaService.resolveItems(input.items);
    const validityDays = normalizeValidityDays(input.validityDays);
    const issueDate = toCalendarDate(input.issueDate, 'issueDate');
    const shiftNote = text(input.shiftNote, 'Shift note', 4000) || buildShiftNote(items);
    const notes = text(input.notes, 'Notes', 4000);
    const internalNotes = text(input.internalNotes, 'Internal notes', 4000);
    const totals = totalsOf(items);

    const proforma = await Proforma.create({
      number: await ProformaService.nextNumber(),
      companyId: company._id,
      siteId: site._id,
      issueDate,
      validityDays,
      validityDate: addDays(issueDate, validityDays),
      status: ProformaStatus.DRAFT,
      items,
      ...totals,
      shiftNote,
      notes,
      internalNotes,
      deliveryEmailPdf: input.deliveryEmailPdf === true || input.deliveryEmailPdf === 'true',
      deliveryHardCopy: input.deliveryHardCopy === true || input.deliveryHardCopy === 'true',
      createdBy: (ctx.userId ?? null) as any,
      updatedBy: (ctx.userId ?? null) as any,
    });

    await ProformaService.audit(ctx, 'PROFORMA_CREATE', proforma, { number: proforma.number });
    return proforma;
  }

  /** Rule 4: once issued the document is frozen — only DRAFTs can be edited. */
  static async update(id: string, input: Record<string, any>, ctx: MarketingCtx) {
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');
    if (proforma.status !== ProformaStatus.DRAFT) {
      throw ApiError.forbidden(`Only DRAFT proformas can be edited (current status: ${proforma.status})`);
    }
    const oldValues = proforma.toObject();

    if (input.companyId !== undefined || input.siteId !== undefined) {
      const { company, site } = await ProformaService.resolveRecipient(
        input.companyId ?? proforma.companyId,
        input.siteId ?? proforma.siteId
      );
      proforma.companyId = company._id;
      proforma.siteId = site._id;
    }
    if (input.items !== undefined) {
      proforma.items = (await ProformaService.resolveItems(input.items)) as any;
      Object.assign(proforma, totalsOf(proforma.items as any));
      if (input.shiftNote === undefined) proforma.shiftNote = buildShiftNote(proforma.items as any);
    }
    if (input.validityDays !== undefined) {
      proforma.validityDays = normalizeValidityDays(input.validityDays);
      proforma.validityDate = addDays(proforma.issueDate, proforma.validityDays);
    }
    if (input.issueDate !== undefined) {
      proforma.issueDate = toCalendarDate(input.issueDate, 'issueDate');
      proforma.validityDate = addDays(proforma.issueDate, proforma.validityDays);
    }
    if (input.shiftNote !== undefined) proforma.shiftNote = text(input.shiftNote, 'Shift note', 4000);
    if (input.notes !== undefined) proforma.notes = text(input.notes, 'Notes', 4000);
    if (input.internalNotes !== undefined) proforma.internalNotes = text(input.internalNotes, 'Internal notes', 4000);
    if (input.deliveryEmailPdf !== undefined) {
      proforma.deliveryEmailPdf = input.deliveryEmailPdf === true || input.deliveryEmailPdf === 'true';
    }
    if (input.deliveryHardCopy !== undefined) {
      proforma.deliveryHardCopy = input.deliveryHardCopy === true || input.deliveryHardCopy === 'true';
    }
    proforma.updatedBy = (ctx.userId ?? null) as any;
    await proforma.save();

    await ProformaService.audit(ctx, 'PROFORMA_UPDATE', proforma, oldValues);
    return proforma;
  }

  static async issue(id: string, ctx: MarketingCtx) {
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');
    if (proforma.status !== ProformaStatus.DRAFT) {
      throw ApiError.badRequest(`Only a DRAFT proforma can be issued (current status: ${proforma.status})`);
    }
    // Re-check the commercial preconditions at issue time: companies/sites/roles
    // may have been deactivated while the draft was being prepared.
    await ProformaService.resolveRecipient(proforma.companyId, proforma.siteId);

    proforma.status = ProformaStatus.ISSUED;
    proforma.issuedAt = new Date();
    proforma.issuedBy = (ctx.userId ?? null) as any;
    await proforma.save();

    await ProformaService.audit(ctx, 'PROFORMA_ISSUE', proforma, { status: ProformaStatus.DRAFT });
    return proforma;
  }

  /** Lifecycle move (accept / expire / convert / cancel) per the transition map. */
  static async setStatus(id: string, nextStatusRaw: unknown, ctx: MarketingCtx) {
    const next = String(nextStatusRaw ?? '').toUpperCase() as ProformaStatus;
    if (!Object.values(ProformaStatus).includes(next)) {
      throw ApiError.badRequest(`status must be one of: ${Object.values(ProformaStatus).join(', ')}`);
    }
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');

    const allowed = PROFORMA_TRANSITIONS[proforma.status] ?? [];
    if (!allowed.includes(next)) {
      throw ApiError.badRequest(
        `A ${proforma.status} proforma cannot move to ${next} (allowed: ${allowed.join(', ') || 'none'})`
      );
    }
    const oldStatus = proforma.status;
    proforma.status = next;
    if (next === ProformaStatus.CANCELLED) proforma.cancelledAt = new Date();
    await proforma.save();

    await ProformaService.audit(ctx, `PROFORMA_${next}`, proforma, { status: oldStatus });
    return proforma;
  }

  /**
   * Atomic per-year allocation: 'PF/VGT/<YEAR>/<NNNN>'. Numbers are never
   * reused, even when a draft is cancelled (rule 7).
   */
  private static async nextNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await ProformaSequence.findOneAndUpdate(
      { key: `PROFORMA-VGT-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return `PF/VGT/${year}/${String(counter!.seq).padStart(4, '0')}`;
  }

  private static async audit(
    ctx: MarketingCtx,
    action: string,
    doc: IProforma,
    oldValues?: unknown
  ) {
    if (!ctx.userId || !doc) return;
    await AuditLog.create({
      userId: ctx.userId,
      action,
      entity: 'Proforma',
      entityId: doc._id,
      oldValues: oldValues ?? undefined,
      newValues: doc.toObject(),
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });
  }
}
