import mongoose, { Schema, Document } from 'mongoose';
import { ServiceCategory, PricingModel, IServiceDetailEntry } from './ServiceLibraryItem';

/**
 * PROFORMA (Marketing — Proposal & Proforma Management, Phase C backend).
 *
 * A proforma is a quotation document quoting one or more services from the
 * Phase A service library. Design rules:
 *
 *  - Every LINE stores an IMMUTABLE SNAPSHOT of the library entry's commercial
 *    details at the moment the line was written. Later edits/deactivations in
 *    the library never rewrite a proforma's quoted value. Drafts may be edited
 *    freely (snapshots are re-resolved while still a draft); once ISSUED the
 *    document is frozen.
 *  - Money is computed SERVER-SIDE from quantity × unitPrice −
 *    discountAmount. Totals sent by the client are never trusted.
 *  - VAT is configurable per proforma (vatRate as a fraction, 0–1).
 *    VAT_DEFAULT_RATE below is a PROPOSED default (15%), not a universal
 *    business rule; unit prices and discount amounts are always VAT-EXCLUSIVE
 *    and grandTotal is the only VAT-INCLUSIVE figure.
 *  - LIFELDIFE (safe transitions only):
 *      DRAFT      → ISSUED       (explicit issue action freezes the document)
 *      DRAFT      → VOID         (draft withdrawn before offering)
 *      ISSUED     → SUPERSEDED   (automatic — set when an amendment of this
 *                                  proforma is issued; never directly settable)
 *    Amendments NEVER modify an issued document: POST /:id/amend creates a
 *    fresh DRAFT revision (revisionNumber = parent + 1) that carries the
 *    parent's lines/snapshots; issuing that revision supersedes the parent.
 *
 *  - Numbering 'PRO-<YYYY>-####' comes from ProformaSequence, an atomic
 *    findOneAndUpdate/$inc counter (same pattern as guard employee codes) so
 *    concurrent creation can never produce duplicate numbers.
 */

export enum ProformaStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  SUPERSEDED = 'SUPERSEDED',
  VOID = 'VOID',
}

/** Live statuses that use a proforma number and participate in amendments. */
export const LIVE_STATUSES: ProformaStatus[] = [ProformaStatus.DRAFT, ProformaStatus.ISSUED];

/** Statuses a proforma may transition to, from its current status. */
export const ALLOWED_TRANSITIONS: Record<ProformaStatus, ProformaStatus[]> = {
  [ProformaStatus.DRAFT]: [ProformaStatus.ISSUED, ProformaStatus.VOID],
  [ProformaStatus.ISSUED]: [ProformaStatus.SUPERSEDED],
  [ProformaStatus.SUPERSEDED]: [],
  [ProformaStatus.VOID]: [],
};

/** PROPOSED default — 15% VAT as a fraction. Vault: configurable per proforma. */
export const PROFORMA_DEFAULT_VAT_RATE = 0.15;

/** Maximum VAT rate accepted (a fraction, so 1.0 = 100%). */
export const PROFORMA_MAX_VAT_RATE = 1;

/**
 * Round money to 2 decimals, rounding decimal halves UP (business rounding).
 * Uses the exponent-string trick so 1150.005 → 1150.01 despite the float
 * product 1150.00500000000... having a low-order binary error; values already
 * in e-notation (never produced by money math here) fall back to plain Math.round.
 */
export function round2(n: number): number {
  if (Number.isInteger(n)) return n;
  if (String(n).includes('e') || String(n).includes('E')) return Math.round(n * 100) / 100;
  const r = Number(Math.round(Number(`${n}e2`)) + 'e-2');
  return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
}

/**
 * Exact-decimal multiplication of a money amount by a business factor
 * (e.g. subtotal × vatRate). Plain float multiplication corrupts money math:
 * 11500.05 × 0.1 evaluates to 1150.0049999999999 in IEEE doubles, misclassifying
 * the true 1150.005 half-cent boundary and rounding VAT to 1150.00 instead of
 * 1150.01. The double nearest 11500.05 is genuinely *below* it, so no amount of
 * string surgery on the product recovers the decimal input — instead:
 *   - the money operand is already cent-rounded (validation guarantees ≤ 2dp),
 *     so it is read as exact integer cents;
 *   - the factor (a business rate like 0.15/0.1/0.07) has its decimal error
 *     beyond the 15th significant digit, so its fixed(12) text after trailing-
 *     zero trimming IS the decimal the caller intended;
 *   - the product of these two exact integers is reassembled losslessly and
 *     handed to round2(), which then rounds the true decimal value.
 */
export function mulExact(money: number, factor: number): number {
  const cents = Math.round(Math.abs(money) * 100); // exact for cent-rounded money
  let fs = factor.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
  if (fs === '0') return 0;
  const negFactor = fs.startsWith('-');
  if (negFactor) fs = fs.slice(1);
  const [fInt, fFrac = ''] = fs.split('.');
  const scale = 2 + fFrac.length; // cents × factor-digits
  const abs = (BigInt(cents) * BigInt(`${fInt || '0'}${fFrac}`)).toString();
  const padded = abs.padStart(scale + 1, '0');
  const value = Number(`${padded.slice(0, -scale)}.${padded.slice(-scale)}`);
  return (negFactor ? -value : value) * (money < 0 ? -1 : 1);
}

/** Immutable copy of the library entry a line was quoted from. */
export interface IServiceSnapshot {
  code: string;
  name: string;
  description: string;
  category: ServiceCategory;
  /** Library default metering unit (the line's own `unit` may override it). */
  unit: string;
  pricingModel: PricingModel;
  /** Structured detail lines (mirror rows + user rows) as stored in the library. */
  structuredDetails: IServiceDetailEntry[];
  maleGuardsPerDay: number | null;
  femaleGuardsPerDay: number | null;
  maleGuardsPerMonth: number | null;
  femaleGuardsPerMonth: number | null;
  monthlySalaryBeforeVatMale: number | null;
  monthlySalaryBeforeVatFemale: number | null;
  shiftNote: string;
  equipmentItems: Array<{ name: string; quantity: number; unit: string; notes?: string }>;
  installationNote: string;
  /** Library entry's active state at quotation time (informational only). */
  libraryActiveAtQuotation: boolean;
}

export interface IProformaLine {
  serviceItemId: mongoose.Types.ObjectId;
  snapshot: IServiceSnapshot;
  quantity: number;
  /** Metering unit shown on THIS quote line (e.g. MONTH, DAY, POINT). */
  unit: string;
  /** ETB, VAT-exclusive. */
  unitPrice: number;
  /** ETB, VAT-exclusive, subtracted after quantity × unitPrice. */
  discountAmount: number;
  /** Computed server-side: round2(quantity × unitPrice − discountAmount). */
  lineTotal: number;
}

/** Customer/recipient block. Embedded values are the quote-time snapshot. */
export interface IProformaClient {
  companyId?: mongoose.Types.ObjectId | null;
  /** Required — every proforma is addressed to someone. */
  name: string;
  contactPerson: string;
  tin: string;
  phone: string;
  email: string;
  address: string;
  /** Free-text recipient line, e.g. 'Attention: Ato Dawit Bekele, Procurement Head'. */
  recipient: string;
}

export interface IProforma extends Document {
  number: string;
  status: ProformaStatus;

  /** 1 for an original; +1 per amendment revision. */
  revisionNumber: number;
  /** The ISSUED proforma this revision supersedes (amendments only). */
  revisesId?: mongoose.Types.ObjectId | null;
  /** Set on the parent while its amendment revision is still live (DRAFT).
   *  Cleared when that revision is voided or issued, so the parent can be
   *  amended again. The atomic claim is the single-live-amendment guard. */
  liveRevisionId?: mongoose.Types.ObjectId | null;
  /** Set on the parent when a revision is issued. */
  supersededById?: mongoose.Types.ObjectId | null;

  client: IProformaClient;
  lines: IProformaLine[];

  /** OPTIONAL quote validity date. There is NO default expiry (Phase C
   *  policy): null/absent means the quote carries no expiry at all. A
   *  supplied date is validated in the service and preserved verbatim on
   *  issuance and on amendment revisions. */
  validUntil: Date | null;

  /** Fraction 0–1 (0 omitted/undefined = no VAT). See PROFORMA_DEFAULT_VAT_RATE. */
  vatRate: number;
  /** Σ lineTotal, VAT-exclusive. */
  subtotal: number;
  /** round2(subtotal × vatRate). */
  vatAmount: number;
  /** subtotal + vatAmount — the only VAT-INCLUSIVE figure. */
  grandTotal: number;

  notes: string;

  issuedAt?: Date | null;
  issuedBy?: mongoose.Types.ObjectId | null;
  voidedAt?: Date | null;
  voidedBy?: mongoose.Types.ObjectId | null;

  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSnapshotSchema = new Schema<IServiceSnapshot>(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, enum: Object.values(ServiceCategory), required: true },
    unit: { type: String, required: true },
    pricingModel: { type: String, enum: Object.values(PricingModel), required: true },
    structuredDetails: { type: [new Schema({ key: String, label: String, value: String }, { _id: false })], default: [] },
    maleGuardsPerDay: { type: Number, default: null },
    femaleGuardsPerDay: { type: Number, default: null },
    maleGuardsPerMonth: { type: Number, default: null },
    femaleGuardsPerMonth: { type: Number, default: null },
    monthlySalaryBeforeVatMale: { type: Number, default: null },
    monthlySalaryBeforeVatFemale: { type: Number, default: null },
    shiftNote: { type: String, default: '' },
    equipmentItems: {
      type: [
        new Schema(
          { name: String, quantity: Number, unit: String, notes: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    installationNote: { type: String, default: '' },
    libraryActiveAtQuotation: { type: Boolean, required: true },
  },
  { _id: false }
);

const clientSchema = new Schema<IProformaClient>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '', trim: true },
    tin: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    recipient: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const lineSchema = new Schema<IProformaLine>(
  {
    serviceItemId: { type: Schema.Types.ObjectId, ref: 'ServiceLibraryItem', required: true },
    snapshot: { type: serviceSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, uppercase: true },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const proformaSchema = new Schema<IProforma>(
  {
    number: { type: String, required: true, match: /^PRO-\d{4}-\d{4,}$/ },
    status: { type: String, enum: Object.values(ProformaStatus), required: true, default: ProformaStatus.DRAFT },

    revisionNumber: { type: Number, required: true, min: 1, default: 1 },
    revisesId: { type: Schema.Types.ObjectId, ref: 'Proforma', default: null },
  liveRevisionId: { type: Schema.Types.ObjectId, ref: 'Proforma', default: null },
    supersededById: { type: Schema.Types.ObjectId, ref: 'Proforma', default: null },

    client: { type: clientSchema, required: true },
    lines: { type: [lineSchema], required: true, min: 1 },

    validUntil: { type: Date, default: null },
    vatRate: { type: Number, required: true, min: 0, max: PROFORMA_MAX_VAT_RATE, default: PROFORMA_DEFAULT_VAT_RATE },
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },

    notes: { type: String, default: '', trim: true, maxlength: 4000 },

    issuedAt: { type: Date, default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

proformaSchema.index({ status: 1 });
proformaSchema.index({ number: 1 }, { unique: true });
proformaSchema.index({ 'client.companyId': 1 });
proformaSchema.index({ issuedAt: -1 });
proformaSchema.index({ revisesId: 1 });
// NOTE: the "one live amendment per parent" invariant is enforced by an ATOMIC
// parent claim (liveRevisionId, see ProformaService.amend), not by a partial
// unique index — plain drafts (revisesId null) and the $in status filter make
// such an index a duplicate-key trap.

export const Proforma = mongoose.model<IProforma>('Proforma', proformaSchema);
