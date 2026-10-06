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
export interface IGuardSiteCompensation extends Document {
  siteId: mongoose.Types.ObjectId;
  compensationAmount: number;
  effectiveFrom: Date;
  /** null/undefined while this row is the current one. */
  effectiveTo?: Date | null;
  isCurrent: boolean;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
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
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

guardSiteCompensationSchema.index({ siteId: 1, effectiveFrom: -1 });
guardSiteCompensationSchema.index({ siteId: 1, isCurrent: 1 });

export const GuardSiteCompensation = mongoose.model<IGuardSiteCompensation>(
  'GuardSiteCompensation',
  guardSiteCompensationSchema
);
