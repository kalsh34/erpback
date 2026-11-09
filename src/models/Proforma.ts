import mongoose, { Schema, Document } from 'mongoose';
import { RoleCategory, RoleGender, ShiftPattern } from './ServiceRole';

/**
 * PROFORMA DOCUMENT (Proforma module).
 *
 * Business rules enforced by ProformaService, mirrored by the schema below:
 *  1. Only an ACTIVE registered company can be quoted.
 *  2. Every line must reference an ACTIVE entry of the ServiceRole catalog.
 *  3. Headcount is computed by the system: posts/day × role multiplier. The
 *     client never supplies totalHeadcount or lineTotal — those values are
 *     recomputed server-side on every create/update.
 *  4. Once status is no longer DRAFT most fields are read-only (only the
 *     lifecycle endpoints may move it forward).
 *  5. Validity defaults to 15 days and is editable.
 *  6. VAT is 15% (PROFORMA_VAT_RATE) and applies only to lines whose role is
 *     VAT-applicable.
 *  7. The proforma number 'PF/VGT/<YEAR>/<NNNN>' is allocated atomically from
 *     ProformaSequence and never reused.
 */

export enum ProformaStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
}

/** Statuses a proforma may move to from its current status. */
export const PROFORMA_TRANSITIONS: Record<ProformaStatus, ProformaStatus[]> = {
  [ProformaStatus.DRAFT]: [ProformaStatus.ISSUED, ProformaStatus.CANCELLED],
  [ProformaStatus.ISSUED]: [
    ProformaStatus.ACCEPTED,
    ProformaStatus.EXPIRED,
    ProformaStatus.CONVERTED,
    ProformaStatus.CANCELLED,
  ],
  [ProformaStatus.ACCEPTED]: [ProformaStatus.CONVERTED, ProformaStatus.CANCELLED],
  [ProformaStatus.EXPIRED]: [ProformaStatus.CONVERTED, ProformaStatus.CANCELLED],
  [ProformaStatus.CONVERTED]: [],
  [ProformaStatus.CANCELLED]: [],
};

/** Fixed VAT rate for the module (rule 6). */
export const PROFORMA_VAT_RATE = 0.15;

/** Default quote validity in days (rule 5). */
export const PROFORMA_DEFAULT_VALIDITY_DAYS = 15;

/** Round money to 2 decimals, half-up (business rounding). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (Number.isInteger(n)) return n;
  const r = Number(`${Math.round(Number(`${n}e2`))}e-2`);
  return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
}

/** Headcount + line value for one quoted role (rule 3). */
export function computeItemValues(postsPerDay: number, multiplier: number, unitRate: number) {
  const totalHeadcount = round2(postsPerDay * multiplier);
  const lineTotal = round2(totalHeadcount * unitRate);
  return { totalHeadcount, lineTotal };
}

/**
 * Document totals. VAT is charged on the VAT-applicable lines only (rule 6);
 * subtotal and grandTotal are cent-rounded.
 */
export function computeProformaTotals(
  items: Array<{ lineTotal: number; vatApplicable: boolean }>,
  vatRate: number = PROFORMA_VAT_RATE
) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0));
  const vatBase = round2(
    items.reduce((s, i) => s + (i.vatApplicable ? Number(i.lineTotal) || 0 : 0), 0)
  );
  const vatAmount = round2(vatBase * vatRate);
  const grandTotal = round2(subtotal + vatAmount);
  return { subtotal, vatAmount, grandTotal };
}

/** Add calendar days to a date (local midnight, DST-safe). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export interface IProformaItem {
  roleId: mongoose.Types.ObjectId;
  roleCode: string;
  roleName: string;
  gender: RoleGender;
  /** Catalog category at quote time (MANPOWER vs K9/ELECTRONIC/OTHER). */
  category: RoleCategory;
  postsPerDay: number;
  multiplier: number;
  totalHeadcount: number;
  unitRate: number;
  lineTotal: number;
  vatApplicable: boolean;
  shiftPattern: ShiftPattern;
  restDaysRule: string;
}

export interface IProforma extends Document {
  number: string;
  companyId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  issueDate: Date;
  validityDays: number;
  validityDate: Date;
  status: ProformaStatus;
  items: IProformaItem[];
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  shiftNote: string;
  notes: string;
  internalNotes: string;
  deliveryEmailPdf: boolean;
  deliveryHardCopy: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  issuedBy?: mongoose.Types.ObjectId | null;
  issuedAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<IProformaItem>(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'ServiceRole', required: true },
    roleCode: { type: String, required: true, trim: true },
    roleName: { type: String, required: true, trim: true },
    gender: { type: String, enum: Object.values(RoleGender), required: true },
    category: { type: String, enum: Object.values(RoleCategory), default: RoleCategory.MANPOWER },
    postsPerDay: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 0 },
    totalHeadcount: { type: Number, required: true, min: 0 },
    unitRate: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    vatApplicable: { type: Boolean, required: true, default: true },
    shiftPattern: { type: String, enum: Object.values(ShiftPattern), required: true },
    restDaysRule: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const proformaSchema = new Schema<IProforma>(
  {
    number: { type: String, required: true, trim: true, match: /^PF\/VGT\/\d{4}\/\d{4,}$/ },
    companyId: { type: Schema.Types.ObjectId, ref: 'ProformaCompany', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'ProformaSite', required: true },
    issueDate: { type: Date, required: true },
    validityDays: { type: Number, required: true, min: 1, max: 365, default: PROFORMA_DEFAULT_VALIDITY_DAYS },
    validityDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(ProformaStatus), required: true, default: ProformaStatus.DRAFT },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    shiftNote: { type: String, default: '', trim: true, maxlength: 4000 },
    notes: { type: String, default: '', trim: true, maxlength: 4000 },
    internalNotes: { type: String, default: '', trim: true, maxlength: 4000 },
    deliveryEmailPdf: { type: Boolean, default: false },
    deliveryHardCopy: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    issuedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

proformaSchema.index({ number: 1 }, { unique: true });
proformaSchema.index({ companyId: 1, issueDate: -1 });
proformaSchema.index({ status: 1 });
proformaSchema.index({ validityDate: 1 });

export const Proforma = mongoose.model<IProforma>('Proforma', proformaSchema);
