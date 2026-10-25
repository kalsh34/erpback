import { ServiceLibraryItem, IServiceLibraryItem, IServiceDetailEntry, ServiceCategory, PricingModel } from '../../models/ServiceLibraryItem';
import { AuditLog } from '../../models/AuditLog';
import { ApiError } from '../../common/ApiError';

export interface ServiceLibraryContext {
  userId?: string;
  ip?: string;
  ua?: string;
}

type ServiceLibraryInput = Partial<IServiceLibraryItem> & Record<string, any>;

/** Fields a client may write for an existing entry (partial update = merge over current). */
const WRITABLE_KEYS = [
  'code', 'name', 'description', 'category', 'unit', 'pricingModel', 'defaultUnitPrice',
  'currency', 'structuredDetails', 'maleGuardsPerDay', 'femaleGuardsPerDay',
  'maleGuardsPerMonth', 'femaleGuardsPerMonth', 'monthlySalaryBeforeVatMale',
  'monthlySalaryBeforeVatFemale', 'shiftNote', 'equipmentItems', 'installationNote',
] as const;

function pickWritable(obj: Record<string, any> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!obj) return out;
  for (const k of WRITABLE_KEYS) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

const NUMBER_OPTIONAL_KEYS = [
  'maleGuardsPerDay',
  'femaleGuardsPerDay',
  'maleGuardsPerMonth',
  'femaleGuardsPerMonth',
  'monthlySalaryBeforeVatMale',
  'monthlySalaryBeforeVatFemale',
] as const;

/** Detail keys the guard/equipment conveniences claim; user-provided rows may not collide with them. */
const RESERVED_DETAIL_KEYS = new Set<string>([...NUMBER_OPTIONAL_KEYS, 'shiftNote', 'installationNote', 'defaultUnitPrice']);

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function nonNegativeNumberOrNull(value: unknown, label: string): number | null {
  if (isBlank(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw ApiError.badRequest(`${label} must be a non-negative number`);
  }
  return n;
}

/** Validate + normalize the write-path payload. Throws ApiError(400) with a clear reason. */
function validateAndNormalize(input: ServiceLibraryInput): ServiceLibraryInput {
  const errors: string[] = [];
  const out: ServiceLibraryInput = { ...input };

  if (isBlank(out.name)) errors.push('Service name is required');
  if (isBlank(out.code)) errors.push('Service code is required');
  else if (!/^[A-Z0-9][A-Z0-9._/-]{1,63}$/.test(String(out.code).toUpperCase())) {
    errors.push('Service code must be 2-64 chars of A-Z, 0-9 and . _ / -');
  } else {
    out.code = String(out.code).toUpperCase();
  }

  if (!Object.values(ServiceCategory).includes(out.category as ServiceCategory)) {
    errors.push(`category must be one of: ${Object.values(ServiceCategory).join(', ')}`);
  }

  if (isBlank(out.unit)) out.unit = 'MONTH';
  out.unit = String(out.unit).toUpperCase().slice(0, 24);

  if (isBlank(out.pricingModel)) out.pricingModel = PricingModel.CUSTOM;
  else if (!Object.values(PricingModel).includes(out.pricingModel as PricingModel)) {
    errors.push(`pricingModel must be one of: ${Object.values(PricingModel).join(', ')}`);
  }

  // Price: forbidden to be negative; zero/omitted means "no library default"
  // (a zero-priced quote line is never meaningful, so 0 normalizes to null).
  if (isBlank(out.defaultUnitPrice)) {
    out.defaultUnitPrice = null;
  } else {
    const price = Number(out.defaultUnitPrice);
    if (!Number.isFinite(price) || price < 0) errors.push('defaultUnitPrice must be a non-negative number');
    else out.defaultUnitPrice = price === 0 ? null : price;
  }

  const currency = isBlank(out.currency) ? 'ETB' : String(out.currency);
  if (!/^[A-Z]{3}$/.test(currency.toUpperCase())) errors.push('currency must be a 3-letter code (e.g. ETB)');
  out.currency = currency.toUpperCase();

  // Guard-service numbers.
  for (const key of NUMBER_OPTIONAL_KEYS) {
    out[key] = nonNegativeNumberOrNull(out[key], key.replace(/([A-Z])/g, ' $1').trim());
  }

  // Cross-checks for guard figures (warning-level correctness, kept strict).
  const maleDay = out.maleGuardsPerDay as number | null;
  const femaleDay = out.femaleGuardsPerDay as number | null;
  if (
    (maleDay != null && femaleDay != null && maleDay === 0 && femaleDay === 0) ||
    (out.maleGuardsPerMonth === 0 && out.femaleGuardsPerMonth === 0)
  ) {
    errors.push('A GUARD_SERVICE entry must staff at least one guard (male or female per day/month)');
  }

  // Equipment items.
  const items = out.equipmentItems;
  if (isBlank(items)) out.equipmentItems = [];
  else {
    if (!Array.isArray(items)) errors.push('equipmentItems must be an array');
    else {
      out.equipmentItems = items.map((raw: any, idx: number) => {
        const row = raw || {};
        if (isBlank(row.name)) errors.push(`equipmentItems[${idx}].name is required`);
        const qty = Number(row.quantity);
        if (!Number.isFinite(qty) || qty < 0) errors.push(`equipmentItems[${idx}].quantity must be a non-negative number`);
        return {
          name: String(row.name ?? '').trim(),
          quantity: qty,
          unit: String(row.unit ?? 'PCS').toUpperCase().slice(0, 16),
          notes: row.notes != null ? String(row.notes).trim() : undefined,
        };
      });
    }
  }

  // structuredDetails flexible key/value rows.
  const details = out.structuredDetails;
  if (isBlank(details)) out.structuredDetails = [];
  else {
    if (!Array.isArray(details)) errors.push('structuredDetails must be an array of { key, label, value }');
    else {
      const seen = new Set<string>();
      out.structuredDetails = details.map((raw: any, idx: number) => {
        const row = raw || {};
        const key = String(row.key ?? row.label ?? '').trim();
        if (!key) errors.push(`structuredDetails[${idx}] needs a key (or label to derive it)`);
        if (row.label == null || String(row.label).trim() === '') errors.push(`structuredDetails[${idx}].label is required`);
        if (row.value == null || String(row.value).trim() === '') errors.push(`structuredDetails[${idx}].value is required`);
        const normalized = key.toLowerCase();
        if (seen.has(normalized)) errors.push(`structuredDetails key '${key}' is duplicated`);
        seen.add(normalized);
        if (RESERVED_DETAIL_KEYS.has(normalized)) {
          errors.push(`structuredDetails key '${key}' is reserved for the guard/equipment fields`);
        }
        return { key, label: String(row.label ?? '').trim(), value: String(row.value ?? '').trim() } as IServiceDetailEntry;
      });
    }
  }

  if (out.category === ServiceCategory.GUARD_SERVICE && isBlank(out.shiftNote)) {
    // Reference proformas always carry the shift/staffing note; leave the field
    // free but note its absence is allowed so legacy entries can be seeded.
  }

  if (errors.length) {
    throw ApiError.badRequest(`Validation failed: ${errors.join('; ')}`);
  }

  // Mirror the conveniences into structuredDetails so the template surface is
  // uniform for the future proforma snapshot step.
  const mirror: Array<[string, string, string]> = [];
  const money = (n: unknown) => (n == null ? '' : String(n));
  if (out.maleGuardsPerDay != null) mirror.push(['maleGuardsPerDay', 'Male guards per day', String(out.maleGuardsPerDay)]);
  if (out.femaleGuardsPerDay != null) mirror.push(['femaleGuardsPerDay', 'Female guards per day', String(out.femaleGuardsPerDay)]);
  if (out.maleGuardsPerMonth != null) mirror.push(['maleGuardsPerMonth', 'Male guards per month (with replacements)', String(out.maleGuardsPerMonth)]);
  if (out.femaleGuardsPerMonth != null) mirror.push(['femaleGuardsPerMonth', 'Female guards per month (with replacements)', String(out.femaleGuardsPerMonth)]);
  if (out.monthlySalaryBeforeVatMale != null) mirror.push(['monthlySalaryBeforeVatMale', 'Monthly salary before VAT per male guard (ETB)', money(out.monthlySalaryBeforeVatMale)]);
  if (out.monthlySalaryBeforeVatFemale != null) mirror.push(['monthlySalaryBeforeVatFemale', 'Monthly salary before VAT per female guard (ETB)', money(out.monthlySalaryBeforeVatFemale)]);
  if (!isBlank(out.shiftNote)) mirror.push(['shiftNote', 'Shift pattern note', String(out.shiftNote)]);
  if (!isBlank(out.installationNote)) mirror.push(['installationNote', 'Installation note', String(out.installationNote)]);
  if (out.defaultUnitPrice != null) mirror.push(['defaultUnitPrice', `Default unit price (${out.currency})`, money(out.defaultUnitPrice)]);
  if ((out.equipmentItems as any[]).length) {
    for (const it of out.equipmentItems as any[]) {
      mirror.push([`equipment:${it.name}`.toLowerCase().slice(0, 60), `Equipment — ${it.name}`, `${it.quantity} ${it.unit}${it.notes ? ` (${it.notes})` : ''}`]);
    }
  }
  const mirroredKeys = new Set(mirror.map(([k]) => k));
  const userRows = (out.structuredDetails as IServiceDetailEntry[]).filter((d) => !mirroredKeys.has(d.key));
  out.structuredDetails = [...mirror.map(([key, label, value]) => ({ key, label, value })), ...userRows];

  return out;
}

export class ServiceLibraryService {

  static async getAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    pricingModel?: string;
    active?: string;
    sort?: string;
    dir?: string;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit ? Math.min(options.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (options.category) query.category = options.category;
    if (options.active === 'true') query.isActive = true;
    if (options.active === 'false') query.isActive = false;
    if (options.search) {
      const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ code: rx }, { name: rx }, { description: rx }];
    }

    const sortField = ['code', 'name', 'category', 'updatedAt'].includes(options.sort || '') ? options.sort! : 'name';
    const sortDir = options.dir === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      ServiceLibraryItem.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(limit),
      ServiceLibraryItem.countDocuments(query),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  static async getById(id: string) {
    const item = await ServiceLibraryItem.findById(id);
    if (!item) throw ApiError.notFound('Service library entry not found');
    return item;
  }

  static async create(input: ServiceLibraryInput, ctx: ServiceLibraryContext) {
    const normalized = validateAndNormalize(input);

    const duplicate = await ServiceLibraryItem.findOne({ code: normalized.code, isActive: true });
    if (duplicate) {
      throw ApiError.conflict(`A service with code ${normalized.code} already exists`);
    }
    // A deactivated entry keeps its historical code; reactivating it is the
    // intended flow, so block creating a fresh active entry over an inactive one.
    const inactive = await ServiceLibraryItem.findOne({ code: normalized.code, isActive: false });
    if (inactive) {
      throw ApiError.conflict(`Code ${normalized.code} already exists as a deactivated entry — reactivate it or choose another code`);
    }

    const created = await ServiceLibraryItem.create({
      ...normalized,
      createdBy: ctx.userId ?? null,
      updatedBy: ctx.userId ?? null,
    });

    await this.audit(ctx, 'SERVICE_LIBRARY_CREATE', created);
    return created;
  }

  static async update(id: string, input: ServiceLibraryInput, ctx: ServiceLibraryContext) {
    const item = await ServiceLibraryItem.findById(id);
    if (!item) throw ApiError.notFound('Service library entry not found');
    if (!item.isActive) throw ApiError.badRequest('Deactivated entries are read-only — reactivate first');

    const oldValues = item.toObject();

    // Partial update: merge the client's write over the CURRENT entry, then
    // validate the merged whole so no field can drop below validity.
    const merged: ServiceLibraryInput = { ...pickWritable(item.toObject()), ...pickWritable(input) };
    const normalized = validateAndNormalize(merged);

    // Code changes must not collide with another ACTIVE entry.
    if (normalized.code !== item.code) {
      const clash = await ServiceLibraryItem.findOne({ code: normalized.code, _id: { $ne: item._id }, isActive: true });
      if (clash) throw ApiError.conflict(`A service with code ${normalized.code} already exists`);
    }

    for (const key of WRITABLE_KEYS) {
      (item as any)[key] = (normalized as any)[key];
    }
    item.updatedBy = (ctx.userId ?? item.updatedBy ?? null) as any;
    await item.save();
    await this.audit(ctx, 'SERVICE_LIBRARY_UPDATE', item, oldValues);
    return item;
  }

  /** Soft deactivation. Entries referenced by future proformas are never hard-deleted. */
  static async deactivate(id: string, ctx: ServiceLibraryContext) {
    const item = await ServiceLibraryItem.findById(id);
    if (!item) throw ApiError.notFound('Service library entry not found');
    if (!item.isActive) return { success: true, message: 'Service library entry already deactivated' };

    item.isActive = false;
    item.deactivatedAt = new Date();
    item.updatedBy = (ctx.userId ?? null) as any;
    await item.save();
    await this.audit(ctx, 'SERVICE_LIBRARY_DEACTIVATE', item, { isActive: true });
    return { success: true, message: 'Service library entry deactivated' };
  }

  static async reactivate(id: string, ctx: ServiceLibraryContext) {
    const item = await ServiceLibraryItem.findById(id);
    if (!item) throw ApiError.notFound('Service library entry not found');
    if (item.isActive) return { success: true, message: 'Service library entry is already active' };

    item.isActive = true;
    item.deactivatedAt = null;
    item.updatedBy = (ctx.userId ?? null) as any;
    await item.save();
    await this.audit(ctx, 'SERVICE_LIBRARY_REACTIVATE', item, { isActive: false });
    return { success: true, message: 'Service library entry reactivated' };
  }

  private static async audit(
    ctx: ServiceLibraryContext,
    action: string,
    doc: IServiceLibraryItem | null,
    oldValues?: unknown
  ) {
    if (!ctx.userId || !doc) return;
    await AuditLog.create({
      userId: ctx.userId,
      action,
      entity: 'ServiceLibraryItem',
      entityId: doc._id,
      oldValues: oldValues ?? undefined,
      newValues: doc.toObject(),
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });
  }
}
