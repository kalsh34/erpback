import mongoose, { Schema, Document } from 'mongoose';

export interface IPensionRule extends Document {
  label: string;
  employeeRate: number;
  employerRate: number;
  pensionTaxBase: 'NORMAL_SALARY_ONLY' | 'GROSS_PAY';
  effectiveFrom: Date;
  effectiveTo?: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pensionRuleSchema = new Schema<IPensionRule>(
  {
    label: { type: String, required: true },
    employeeRate: { type: Number, required: true },
    employerRate: { type: Number, required: true },
    pensionTaxBase: { type: String, enum: ['NORMAL_SALARY_ONLY', 'GROSS_PAY'], default: 'NORMAL_SALARY_ONLY' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

pensionRuleSchema.index({ isCurrent: 1 });

export const PensionRule = mongoose.model<IPensionRule>('PensionRule', pensionRuleSchema);
