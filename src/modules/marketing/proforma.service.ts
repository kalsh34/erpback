import { Types } from 'mongoose';
import { Proforma, IProforma, IProformaLine, IServiceSnapshot, ProformaStatus, LIVE_STATUSES, PROFORMA_DEFAULT_VAT_RATE, round2, mulExact } from '../../models/Proforma';
import { ProformaSequence } from '../../models/ProformaSequence';
import { ServiceLibraryItem } from '../../models/ServiceLibraryItem';
import { AuditLog } from '../../models/AuditLog';
import { ApiError } from '../../common/ApiError';
import { Permission, PERMISSIONS } from '../../types';

export interface ProformaContext {
  userId?: string;
  ip?: string;
  ua?: string;
  /** Effective per-user permissions from authenticate(); empty when absent.
   *  Used for conditional authorization below route gates — discount changes
   *  additionally require PROFORMA_DISCOUNT (Phase C policy). */
  permissions?: Permission[];
}

/**
 * DISCOUNT AUTHORIZATION — applying or modifying a line discount requires the
 * dedicated PROFORMA_DISCOUNT permission. It is deliberately NOT part of the
 * `marketing` module bundle, so a marketing module grant confers draft
 * creation/editing but never discount authority.
 */
function canApproveDiscounts(ctx: ProformaContext): boolean {
  return (ctx.permissions ?? []).includes(PERMISSIONS.PROFORMA_DISCOUNT);
}

const MAX_LINES = 200;
const CLIENT_TEXT_MAX = 500;

type RawInput = Record<string, any>;

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

function finiteNumber(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw ApiError.badRequest(`${label} must be a finite number`);
  return n;
}

function boundedText(value: unknown, label: string, max = CLIENT_TEXT_MAX): string {
  const s = isBlank(value) ? '' : String(value).trim();
  if (s.length > max) throw ApiError.badRequest(`${label} must be at most ${max} characters`);
  return s;
}

export interface NormalizedClient {
  companyId: Types.ObjectId | null;
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  address: string;
  recipient: string;
}

/** Validate + normalize the customer/recipient block. */
function normalizeClient(input: RawInput): NormalizedClient {
  const clientBlock = (input.client && typeof input.client === 'object' ? input.client : {}) as RawInput;
  const top: RawInput = input;

  const name = boundedText(clientBlock.name ?? top.clientName, 'client.name', 300);
  if (!name) throw ApiError.badRequest('client.name is required (who the proforma is addressed to)');

  let companyId: Types.ObjectId | null = null;
  const companyRef = clientBlock.companyId ?? top.companyId;
  if (!isBlank(companyRef)) {
    if (!Types.ObjectId.isValid(String(companyRef))) {
      throw ApiError.badRequest('client.companyId must be a valid company id');
    }
    companyId = new Types.ObjectId(String(companyRef));
  }

  return {
    companyId,
    name,
    contactPerson: boundedText(clientBlock.contactPerson ?? top.contactPerson, 'client.contactPerson'),
    tin: boundedText(clientBlock.tin ?? top.tin, 'client.tin', 64),
    phone: boundedText(clientBlock.phone ?? top.phone, 'client.phone', 64),
    email: boundedText(clientBlock.email ?? top.email, 'client.email', 320),
    address: boundedText(clientBlock.address ?? top.address, 'client.address'),
    recipient: boundedText(clientBlock.recipient ?? top.recipient, 'client.recipient'),
  };
}

/**
 * OPTIONAL VALIDITY DATE — there is NO default expiry (Phase C policy). An
 * absent/blank value stores no expiry at all; a supplied value must parse to
 * a real date or the request is rejected.
 */
function normalizeValidUntil(input: RawInput): Date | null {
  if (isBlank(input.validUntil)) return null;
  const d = new Date(String(input.validUntil));
  if (Number.isNaN(d.getTime())) {
    throw ApiError.badRequest('validUntil must be a valid date (e.g. "2027-03-01") or omitted for no expiry');
  }
  return d;
}

/**
 * DISCOUNT AUTHORIZATION on line submissions. Without PROFORMA_DISCOUNT a
 * caller may not introduce a nonzero discount, may not change an approved
 * one, and may not remove one — including by dropping the discounted line or
 * reordering terms. Submitted lines are matched to existing ones by
 * serviceItemId + quantity + unitPrice (an exact-term greedy match that
 * tolerates reordering); any applied/approved discount that differs or goes
 * unaccounted is a 403 — never a silent strip or a mutated document. An edit
 * that keeps every approved discount byte-for-byte (e.g. a notes-only change
 * or lines-without-discount check) passes and needs no escalation.
 */
function enforceDiscountAuthorization(
  submitted: IProformaLine[],
  existing: IProformaLine[] | undefined,
  ctx: ProformaContext
): void {
  if (canApproveDiscounts(ctx)) return;
  const remaining = (existing ?? []).map((l) => ({
    item: String(l.serviceItemId),
    qty: l.quantity,
    price: l.unitPrice,
    discount: l.discountAmount ?? 0,
  }));
  const used = new Set<number>();
  const prevDiscountFor = (line: IProformaLine): number => {
    const key = String(line.serviceItemId);
    for (let j = 0; j < remaining.length; j++) {
      if (used.has(j)) continue;
      const r = remaining[j];
      if (r.item !== key || r.qty !== line.quantity || r.price !== line.unitPrice) continue;
      used.add(j);
      return r.discount;
    }
    return 0;
  };
  for (const line of submitted) {
    const prev = prevDiscountFor(line);
    const next = line.discountAmount ?? 0;
    if (prev !== next) {
      throw ApiError.forbidden(
        'Applying, changing or removing a line discount requires the proforma.discount permission (manager only)'
      );
    }
  }
  // Removal by omission: an existing discounted line vanishes from the
  // submitted set entirely.
  if (remaining.some((r, j) => !used.has(j) && r.discount > 0)) {
    throw ApiError.forbidden(
      'Removing a line discount by dropping the line requires the proforma.discount permission (manager only)'
    );
  }
}

/** VAT rate: fraction 0–1. Omitted → PROPOSED default (15%), 0 = no VAT. */
function normalizeVatRate(input: RawInput): number {
  if (isBlank(input.vatRate)) return PROFORMA_DEFAULT_VAT_RATE;
  const vat = finiteNumber(input.vatRate, 'vatRate');
  if (vat < 0 || vat > 1) {
    throw ApiError.badRequest('vatRate must be a fraction between 0 and 1 (e.g. 0.15 for 15%)');
  }
  return vat;
}

/** Immutable snapshot of a library entry (PlainObject or ServiceLibraryItem). */
function snapshotFromLibrary(src: any): IServiceSnapshot {
  return {
    code: src.code,
    name: src.name,
    description: src.description ?? '',
    category: src.category,
    unit: src.unit,
    pricingModel: src.pricingModel,
    structuredDetails: (src.structuredDetails ?? []).map((d: any) => ({
      key: d.key, label: d.label, value: d.value,
    })),
    maleGuardsPerDay: src.maleGuardsPerDay ?? null,
    femaleGuardsPerDay: src.femaleGuardsPerDay ?? null,
    maleGuardsPerMonth: src.maleGuardsPerMonth ?? null,
    femaleGuardsPerMonth: src.femaleGuardsPerMonth ?? null,
    monthlySalaryBeforeVatMale: src.monthlySalaryBeforeVatMale ?? null,
    monthlySalaryBeforeVatFemale: src.monthlySalaryBeforeVatFemale ?? null,
    shiftNote: src.shiftNote ?? '',
    equipmentItems: (src.equipmentItems ?? []).map((e: any) => ({
      name: e.name,
      quantity: e.quantity,
      unit: e.unit,
      ...(e.notes ? { notes: e.notes } : {}),
    })),
    installationNote: src.installationNote ?? '',
    libraryActiveAtQuotation: !!src.isActive,
  };
}

/**
 * Validate quote lines and (re)resolve their snapshots from the CURRENT library
 * state. Money is recomputed server-side: unitPrice/discount are ETB,
 * VAT-EXCLUSIVE; client-supplied totals are never trusted.
 */
function validateLines(rawLines: unknown, library: Map<string, any>): IProformaLine[] {
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    throw ApiError.badRequest('A proforma must quote at least one service line (lines is a required array)');
  }
  if (rawLines.length > MAX_LINES) {
    throw ApiError.badRequest(`A proforma may quote at most ${MAX_LINES} lines`);
  }

  const lines: IProformaLine[] = [];
  for (const [i, rawRow] of rawLines.entries()) {
    const row = rawRow || {};
    if (isBlank(row.serviceItemId)) throw ApiError.badRequest(`lines[${i}].serviceItemId is required`);
    const idStr = String(row.serviceItemId);
    if (!Types.ObjectId.isValid(idStr)) {
      throw ApiError.badRequest(`lines[${i}].serviceItemId is not a valid id`);
    }
    const lib = library.get(idStr);
    if (!lib) throw ApiError.badRequest(`lines[${i}] references unknown service library entry ${idStr}`);

    const quantity = isBlank(row.quantity) ? 0 : finiteNumber(row.quantity, `lines[${i}].quantity`);
    if (quantity < 0) throw ApiError.badRequest(`lines[${i}].quantity must be non-negative`);

    const unitPrice = isBlank(row.unitPrice) ? 0 : finiteNumber(row.unitPrice, `lines[${i}].unitPrice`);
    if (unitPrice < 0) throw ApiError.badRequest(`lines[${i}].unitPrice must be non-negative`);

    const discountAmount = isBlank(row.discountAmount) ? 0 : finiteNumber(row.discountAmount, `lines[${i}].discountAmount`);
    if (discountAmount < 0) throw ApiError.badRequest(`lines[${i}].discountAmount must be non-negative`);
    const gross = quantity * unitPrice;
    if (gross - discountAmount < 0) {
      throw ApiError.badRequest(`lines[${i}].discountAmount cannot exceed the line amount (quantity × unitPrice)`);
    }

    const unit = (isBlank(row.unit) ? lib.unit : String(row.unit)).toUpperCase().trim().slice(0, 24) || 'UNIT';

    lines.push({
      serviceItemId: new Types.ObjectId(idStr),
      snapshot: snapshotFromLibrary(lib),
      quantity,
      unit,
      unitPrice,
      discountAmount,
      lineTotal: round2(gross - discountAmount),
    } as IProformaLine);
  }
  return lines;
}

/** Compute the money block from validated lines + vatRate (VAT-exclusive → inclusive). */
function computeMoney(lines: IProformaLine[], vatRate: number) {
  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const vatAmount = round2(mulExact(subtotal, vatRate));
  const grandTotal = round2(subtotal + vatAmount);
  return { subtotal, vatAmount, grandTotal };
}

/** Load the library entries referenced by raw line rows; throw 400 listing misses. */
async function loadLibraryOrThrow(rawLines: unknown): Promise<Map<string, any>> {
  const idList = (Array.isArray(rawLines) ? rawLines : [])
    .map((r: any) => (r?.serviceItemId != null ? String(r.serviceItemId) : ''))
    .filter((id: string) => id);
  const validIds = [...new Set(idList.filter((id) => Types.ObjectId.isValid(id)))];
  const docs = await ServiceLibraryItem.find({ _id: { $in: validIds } }).lean();
  const map = new Map<string, any>();
  for (const d of docs as any[]) map.set(String(d._id), d);
  for (const id of validIds) {
    if (!map.has(id)) throw ApiError.badRequest(`Line references unknown service library entry ${id}`);
  }
  return map;
}

export class ProformaService {
  static async getAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    companyId?: string;
    sort?: string;
    dir?: string;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit ? Math.min(options.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    const statusFilter = options.status?.toUpperCase();
    if (statusFilter === 'LIVE') query.status = { $in: LIVE_STATUSES };
    else if (statusFilter && statusFilter !== 'ALL') {
      if (!Object.values(ProformaStatus).includes(statusFilter as ProformaStatus)) {
        throw ApiError.badRequest(`status must be one of: ${Object.values(ProformaStatus).join(', ')}, LIVE, ALL`);
      }
      query.status = statusFilter;
    }
    if (options.companyId && Types.ObjectId.isValid(options.companyId)) {
      query['client.companyId'] = new Types.ObjectId(options.companyId);
    }
    if (options.search) {
      const rx = new RegExp(options.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { number: rx },
        { 'client.name': rx },
        { 'client.tin': rx },
        { 'lines.snapshot.name': rx },
      ];
    }

    const sortField = ['number', 'status', 'grandTotal', 'updatedAt', 'issuedAt'].includes(options.sort || '')
      ? options.sort!
      : 'number';
    const dir = options.dir === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      Proforma.find(query).sort({ [sortField]: dir }).skip(skip).limit(limit),
      Proforma.countDocuments(query),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  static async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid proforma id');
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');
    return proforma;
  }

  // ── draft lifecycle ─────────────────────────────────────────────────

  static async create(input: RawInput, ctx: ProformaContext) {
    const library = await loadLibraryOrThrow(input.lines);
    const lines = validateLines(input.lines, library);
    const vatRate = normalizeVatRate(input);
    const client = normalizeClient(input);
    const notes = boundedText(input.notes, 'notes', 4000);
    // Phase C policy: only explicitly authorized managers may apply discounts.
    enforceDiscountAuthorization(lines, undefined, ctx);
    const validUntil = normalizeValidUntil(input);
    const number = await this.nextNumber();

    const created = await Proforma.create({
      number,
      status: ProformaStatus.DRAFT,
      revisionNumber: 1,
      client,
      lines,
      vatRate,
      validUntil,
      ...computeMoney(lines, vatRate),
      notes,
      createdBy: (ctx.userId ?? null) as any,
      updatedBy: (ctx.userId ?? null) as any,
    });

    await this.audit(ctx, 'PROFORMA_CREATE', created);
    if (lines.some((l) => (l.discountAmount ?? 0) > 0)) {
      await this.audit(ctx, 'PROFORMA_DISCOUNT', created, null, { approvedBy: ctx.userId });
    }
    return created;
  }

  /**
   * Draft-only editing.
   *  - client / vatRate / notes: merged field-wise over the current draft.
   *  - lines: if supplied, re-resolve every snapshot from the CURRENT library
   *    (a draft quote is still being composed); if absent, the existing line
   *    documents — with their already-frozen snapshots — are kept verbatim.
   * Money recomputed both ways; client totals are never trusted.
   */
  static async update(id: string, input: RawInput, ctx: ProformaContext) {
    const current = await Proforma.findById(id);
    if (!current) throw ApiError.notFound('Proforma not found');
    if (current.status !== ProformaStatus.DRAFT) {
      throw ApiError.forbidden(
        `Only DRAFT proformas can be edited (current status: ${current.status}). To change an issued quote, POST /:id/amend for a revision.`
      );
    }

    const oldValues = current.toObject();

    let lines: IProformaLine[];
    if (input.lines !== undefined) {
      const library = await loadLibraryOrThrow(input.lines);
      lines = validateLines(input.lines, library);
      // Phase C policy: discount changes (add/change/remove) on a submitted
      // lines array are manager-only and are rejected BEFORE any mutation.
      enforceDiscountAuthorization(lines, (current.lines as any) as IProformaLine[], ctx);
    } else {
      lines = (current.lines as any) as IProformaLine[];
    }

    current.client = normalizeClient({
      ...input,
      // field-wise merge over the CURRENT client block: absent fields keep values
      client: {
        name: current.client.name,
        contactPerson: current.client.contactPerson,
        tin: current.client.tin,
        phone: current.client.phone,
        email: current.client.email,
        address: current.client.address,
        recipient: current.client.recipient,
        ...(input.client ?? {}),
      },
    }) as any;
    if (input.vatRate !== undefined) current.vatRate = normalizeVatRate(input);
    if (input.notes !== undefined) current.notes = boundedText(input.notes, 'notes', 4000);
    // Validity date is optional and NULLABLE: absent → keep as-is; explicit
    // null/'' → clear (no expiry is stored unless a date was supplied).
    if (input.validUntil !== undefined) current.validUntil = normalizeValidUntil(input);
    current.lines = lines as any;
    Object.assign(current, computeMoney(lines, current.vatRate));
    current.updatedBy = (ctx.userId ?? null) as any;
    await current.save();
    await this.audit(ctx, 'PROFORMA_UPDATE', current, oldValues);
    // Distinct, auditable discount-approval trail: logged only when an
    // authorized user actually changed the discount amount on a lines edit.
    if (input.lines !== undefined && canApproveDiscounts(ctx)) {
      const oldDiscount = ((oldValues as any).lines ?? []).reduce(
        (s: number, l: any) => s + (l.discountAmount ?? 0), 0);
      const newDiscount = lines.reduce((s, l) => s + (l.discountAmount ?? 0), 0);
      if (newDiscount !== oldDiscount) {
        await this.audit(ctx, 'PROFORMA_DISCOUNT', current,
          { discountTotal: round2(oldDiscount) },
          { discountTotal: round2(newDiscount), approvedBy: ctx.userId });
      }
    }
    return current;
  }

  // ── issue / void / amend ────────────────────────────────────────────

  /** DRAFT → ISSUED. Issuing a revision additionally supersedes its parent. */
  static async issue(id: string, ctx: ProformaContext) {
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');
    if (proforma.status !== ProformaStatus.DRAFT) {
      throw ApiError.badRequest(`Only a DRAFT proforma can be issued (current status: ${proforma.status})`);
    }

    let supersededParent: IProforma | null = null;
    if (proforma.revisesId) {
      const parent = await Proforma.findById(proforma.revisesId);
      if (!parent) throw ApiError.conflict('The amended proforma no longer exists');
      if (parent.status !== ProformaStatus.ISSUED) {
        throw ApiError.conflict(`The amended proforma is ${parent.status}; it must be ISSUED to be superseded`);
      }
      parent.status = ProformaStatus.SUPERSEDED;
      parent.supersededById = proforma._id as any;
      parent.liveRevisionId = null;
      supersededParent = parent;
    }

    const oldStatus = proforma.status;
    proforma.status = ProformaStatus.ISSUED;
    proforma.issuedAt = new Date();
    proforma.issuedBy = (ctx.userId ?? null) as any;
    try {
      await proforma.save();
    } catch (err: any) {
      if (err?.code === 11000) throw ApiError.conflict('A live amendment of the parent already exists — refresh and retry');
      throw err;
    }

    if (supersededParent) {
      await supersededParent.save();
      await this.audit(ctx, 'PROFORMA_SUPERSEDED', supersededParent, { status: 'ISSUED' }, { supersededBy: proforma.number });
      await this.audit(ctx, 'PROFORMA_ISSUE', proforma, { status: oldStatus }, { supersedes: supersededParent.number });
    } else {
      await this.audit(ctx, 'PROFORMA_ISSUE', proforma, { status: oldStatus });
    }
    return { proforma, superseded: supersededParent };
  }

  /** DRAFT → VOID. Issued documents never transition to VOID (amend instead). */
  static async void_(id: string, ctx: ProformaContext) {
    const proforma = await Proforma.findById(id);
    if (!proforma) throw ApiError.notFound('Proforma not found');
    if (proforma.status !== ProformaStatus.DRAFT) {
      throw ApiError.badRequest(`Only a DRAFT proforma can be voided (current status: ${proforma.status})`);
    }
    const oldValues = { status: proforma.status };
    proforma.status = ProformaStatus.VOID;
    proforma.voidedAt = new Date();
    proforma.voidedBy = (ctx.userId ?? null) as any;
    // Voiding an amendment revision releases its parent for a fresh amendment.
    let clearedParent: IProforma | null = null;
    if (proforma.revisesId) {
      const parent = await Proforma.findOne({ _id: proforma.revisesId, liveRevisionId: proforma._id });
      if (parent) { parent.liveRevisionId = null; clearedParent = parent; }
    }
    await proforma.save();
    if (clearedParent) await clearedParent.save();
    await this.audit(ctx, 'PROFORMA_VOID', proforma, oldValues);
    return proforma;
  }

  /**
   * Amendments never rewrite an issued quotation: clone its documented values
   * (including the frozen snapshots) into a fresh DRAFT revision. Editing the
   * draft and issuing it supersedes this parent. A parent that is already
   * superseded — or that already has a live amendment — cannot be amended.
   */
  static async amend(id: string, ctx: ProformaContext) {
    const parent = await Proforma.findById(id);
    if (!parent) throw ApiError.notFound('Proforma not found');
    if (parent.supersededById) {
      throw ApiError.conflict('This proforma is already superseded — amend the current revision instead');
    }
    if (parent.status !== ProformaStatus.ISSUED) {
      throw ApiError.badRequest(`Only an ISSUED proforma can be amended (current status: ${parent.status})`);
    }
    if (parent.liveRevisionId) {
      throw ApiError.conflict('A live amendment already exists for this proforma — void or issue it first');
    }

    const number = await this.nextNumber();
    const clone = parent.toObject();
    const draft = await Proforma.create({
      number,
      status: ProformaStatus.DRAFT,
      revisionNumber: parent.revisionNumber + 1,
      revisesId: parent._id,
      validUntil: parent.validUntil ?? null,
      client: clone.client,
      lines: clone.lines,
      vatRate: parent.vatRate,
      subtotal: parent.subtotal,
      vatAmount: parent.vatAmount,
      grandTotal: parent.grandTotal,
      notes: parent.notes,
      createdBy: (ctx.userId ?? null) as any,
      updatedBy: (ctx.userId ?? null) as any,
    });

    // ATOMIC single-live-amendment claim: the parent can be claimed by exactly
    // one draft. A failed claim (another request claimed it first) removes the
    // just-created draft and reports the conflict — no exotic partial indexes.
    const claim = await Proforma.updateOne(
      { _id: parent._id, status: ProformaStatus.ISSUED, liveRevisionId: null, supersededById: null },
      { $set: { liveRevisionId: draft._id } as any }
    );
    if (claim.modifiedCount !== 1) {
      await Proforma.deleteOne({ _id: draft._id, revisesId: parent._id, status: ProformaStatus.DRAFT });
      throw ApiError.conflict('A live amendment already exists for this proforma (claimed concurrently)');
    }

    await this.audit(ctx, 'PROFORMA_AMEND', draft, null, { amends: parent.number });
    return draft;
  }

  /**
   * PROFORMA NUMBERING — atomic allocation from a per-year counter document
   * (findOneAndUpdate/$inc upsert, same pattern as guard employee codes), so
   * concurrent creation cannot produce duplicate 'PRO-<YYYY>-####' numbers.
   */
  private static async nextNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const counter = await ProformaSequence.findOneAndUpdate(
      { key: `PROFORMA-${year}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
    return `PRO-${year}-${String(counter!.seq).padStart(4, '0')}`;
  }

  private static async audit(
    ctx: ProformaContext,
    action: string,
    doc: IProforma | null,
    oldValues?: unknown,
    extraNew: Record<string, unknown> = {}
  ) {
    if (!ctx.userId || !doc) return;
    await AuditLog.create({
      userId: ctx.userId,
      action,
      entity: 'Proforma',
      entityId: doc._id,
      oldValues: oldValues ?? undefined,
      newValues: { ...(doc.toObject() as Record<string, unknown>), ...extraNew },
      ipAddress: ctx.ip,
      userAgent: ctx.ua,
    });
  }
}
