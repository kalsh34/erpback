import mongoose, { Schema, Document } from 'mongoose';

/**
 * Reusable marketing service library (Proposal & Proforma module — Phase A).
 *
 * A entry describes ONE re-usable service the company sells (guard service,
 * CCTV, alarm, QR patrol, access control, custom package). Proformas built in a
 * later phase will COPY the description/detail/price values out of these
 * entries as a snapshot, so later edits here never rewrite old quotes.
 *
 * Pricing is intentionally NOT one identical structure for every category:
 *  - guard services quote "monthly salary BEFORE VAT per one guard" with
 *    male/female staffing and the 24h-on/48h-off shift note (see the Tiga
 *    Hotel and Garment Residence reference proformas);
 *  - equipment services quote per-item quantities/installation details.
 * Both shapes are expressed with the flexible `structuredDetails` key/value
 * blocks plus a `pricingModel` hint, so no category is forced into another's
 * schema. VAT is deliberately out of scope in Phase A (15% is only a proposed
 * default for the future proforma phase).
 */

export enum ServiceCategory {
  GUARD_SERVICE = 'GUARD_SERVICE',
  CCTV = 'CCTV',
  ALARM = 'ALARM',
  QR_PATROL = 'QR_PATROL',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
  CUSTOM = 'CUSTOM',
}

export enum PricingModel {
  MONTHLY_PER_GUARD = 'MONTHLY_PER_GUARD',
  PER_DAY = 'PER_DAY',
  PER_UNIT = 'PER_UNIT',
  PER_INSTALLATION = 'PER_INSTALLATION',
  CUSTOM = 'CUSTOM',
}

/** One labeled value line of a service description (flexible detail block). */
export interface IServiceDetailEntry {
  key: string;
  label: string;
  value: string;
}

export interface IServiceLibraryItem extends Document {
  /** Stable, unique business code, e.g. SVC-GUARD-M. */
  code: string;
  name: string;
  description: string;
  category: ServiceCategory;
  /** Metering word shown on proforma lines, e.g. MONTH, DAY, UNIT, POINT. */
  unit: string;
  pricingModel: PricingModel;
  /** Optional default unit price (ETB, VAT-exclusive). Null = price is always set per proforma. */
  defaultUnitPrice: number | null;
  currency: string;

  /** Category-specific structured detail lines (current-value template, not a snapshot). */
  structuredDetails: IServiceDetailEntry[];

  // ── Guard-service conveniences (mirrored into structuredDetails by the service layer) ──
  maleGuardsPerDay?: number | null;
  femaleGuardsPerDay?: number | null;
  maleGuardsPerMonth?: number | null;
  femaleGuardsPerMonth?: number | null;
  monthlySalaryBeforeVatMale?: number | null;
  monthlySalaryBeforeVatFemale?: number | null;
  shiftNote?: string;

  // ── Equipment conveniences (CCTV/ALARM/QR/ACCESS_CONTROL) ──
  equipmentItems: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  installationNote?: string;

  /** Soft deactivation — entries referenced by future proformas are never hard-deleted. */
  isActive: boolean;
  deactivatedAt?: Date | null;

  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const detailEntrySchema = new Schema<IServiceDetailEntry>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const equipmentItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, default: 'PCS' },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const serviceLibraryItemSchema = new Schema<IServiceLibraryItem>(
  {
    // NOTE: uniqueness is enforced by the PARTIAL unique index below (active docs
    // only), not by field-level `unique: true` — an inactive entry keeps its code.
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9][A-Z0-9._/-]{1,63}$/, 'Service code must be 2-64 chars of A-Z, 0-9 and . _ / -'],
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: Object.values(ServiceCategory), required: true },
    unit: { type: String, required: true, trim: true, default: 'MONTH', uppercase: true },
    pricingModel: { type: String, enum: Object.values(PricingModel), default: PricingModel.CUSTOM },
    defaultUnitPrice: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'ETB', uppercase: true },

    structuredDetails: { type: [detailEntrySchema], default: [] },

    maleGuardsPerDay: { type: Number, default: null, min: 0 },
    femaleGuardsPerDay: { type: Number, default: null, min: 0 },
    maleGuardsPerMonth: { type: Number, default: null, min: 0 },
    femaleGuardsPerMonth: { type: Number, default: null, min: 0 },
    monthlySalaryBeforeVatMale: { type: Number, default: null, min: 0 },
    monthlySalaryBeforeVatFemale: { type: Number, default: null, min: 0 },
    shiftNote: { type: String, default: '' },

    equipmentItems: { type: [equipmentItemSchema], default: [] },
    installationNote: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

serviceLibraryItemSchema.index({ category: 1 });
serviceLibraryItemSchema.index({ isActive: 1 });
serviceLibraryItemSchema.index({ name: 1 });

// Only one active entry per business code is a write-path rule, but the stale
// inactive doc keeps history: partial unique index on active documents only.
serviceLibraryItemSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export const ServiceLibraryItem = mongoose.model<IServiceLibraryItem>('ServiceLibraryItem', serviceLibraryItemSchema);
