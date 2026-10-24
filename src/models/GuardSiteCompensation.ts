import mongoose, { Schema, Document } from 'mongoose';

/**
 * GUARD SITE COMPENSATION — the agreed monthly compensation a site pays a
 * guard. Site-level (not per-guard) and effective-dated so historical payroll
 * stays accurate when rates change.
 *
 * This is the ONLY rate source for guard payroll. The legacy duplicate fields
 * are deliberately NOT read by payroll:
 *   PrimarySiteAssignment.hourlyRate, GuardProfile.rate, Site.paymentPrice,
 *   Company.paymentPrice / defaultOtPrice, Employee.salary / transportAllowance.
 *
 * Derived values are never stored — always computed by the engine:
 *   OT Rate                = compensationAmount / standardMonthlyHours (240)
 *   Sunday Structural      = OT Rate × 32
 *   Remaining              = compensationAmount − Sunday Structural
 *   Transport              = Remaining × transport%  (not taxable, primary only)
 *   Basic Salary           = Remaining − Transport
 *   Basic Hourly Rate      = Basic Salary / 208
 */
/**
 * Optional PER-SITE formula overrides. Any missing number falls back to the
 * global GuardPayrollConfig singleton, so existing sites change nothing.
 * Stored on the effective-dated compensation row so history stays accurate:
 * past payroll snapshots the resolved values it actually used.
 */
export interface ISiteFormulaOverride {
  transportPercent?: number;
  standardMonthlyHours?: number;
  sundayStructuralHours?: number;
  basicHourlyDivisor?: number;
}

export interface IGuardSiteCompensation extends Document {
  siteId: mongoose.Types.ObjectId;
  compensationAmount: number;
  /** Optional per-site formula (divisors / transport %). Missing values fall back to global config. */
  formula?: ISiteFormulaOverride;
  effectiveFrom: Date;
  /** null/undefined while this row is the current one. */
  effectiveTo?: Date | null;
  isCurrent: boolean;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  /** Audit trail for same-day amendments of the current row. */
  changeHistory: {
    previousAmount: number;
    newAmount: number;
    previousFormula?: ISiteFormulaOverride | null;
    newFormula?: ISiteFormulaOverride | null;
    reason?: string;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const guardSiteCompensationSchema = new Schema<IGuardSiteCompensation>(
  {
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    compensationAmount: {
      type: Number,
      required: true,
      min: [0, 'Compensation cannot be negative'],
      validate: {
        validator: (v: number) => Math.round(v * 100) / 100 === v,
        message: 'Compensation supports at most 2 decimal places',
      },
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isCurrent: { type: Boolean, default: true },
    formula: {
      type: {
        transportPercent: { type: Number, min: 0, max: 100 },
        standardMonthlyHours: { type: Number, min: 1, max: 744 },
        sundayStructuralHours: { type: Number, min: 0, max: 200 },
        basicHourlyDivisor: { type: Number, min: 1, max: 744 },
      },
      default: null,
    },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [{
      previousAmount: { type: Number, required: true },
      newAmount: { type: Number, required: true },
      previousFormula: { type: Schema.Types.Mixed, default: null },
      newFormula: { type: Schema.Types.Mixed, default: null },
      reason: { type: String, trim: true },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      changedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

guardSiteCompensationSchema.index({ siteId: 1, effectiveFrom: -1 });
guardSiteCompensationSchema.index({ siteId: 1, isCurrent: 1 });
// Hard rule: ONE current compensation rate per site. A rate may belong to one
// site only — a site can never carry two current rows (DB-enforced).
guardSiteCompensationSchema.index(
  { siteId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

export const GuardSiteCompensation = mongoose.model<IGuardSiteCompensation>(
  'GuardSiteCompensation',
  guardSiteCompensationSchema
);
