import mongoose, { Schema, Document } from 'mongoose';

/**
 * PENSION RULE — date-effective employee/employer percentages with optional
 * pensionable-salary caps. Re-created after the v1 teardown; shared by guard
 * and staff payroll. Guard payroll applies it ONLY to the primary-site salary
 * base (never to additional-site earnings, never to transport).
 */
export type PensionRuleKind = 'GUARD' | 'STAFF';

export interface IPensionRule extends Document {
  name: string;
  kind?: PensionRuleKind;
  employeePercent: number;
  employerPercent: number;
  minPensionableSalary?: number | null;
  maxPensionableSalary?: number | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pensionRuleSchema = new Schema<IPensionRule>(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['GUARD', 'STAFF'], default: 'GUARD' },
    employeePercent: { type: Number, required: true, min: 0, max: 100 },
    employerPercent: { type: Number, required: true, min: 0, max: 100 },
    minPensionableSalary: { type: Number, default: null },
    maxPensionableSalary: { type: Number, default: null },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pensionRuleSchema.index({ effectiveFrom: -1 });

export const PensionRule = mongoose.model<IPensionRule>('PensionRule', pensionRuleSchema);
