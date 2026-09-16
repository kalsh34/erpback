import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollFormulaVersion extends Document {
  version: number;
  isCurrent: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  grossComponentCodes: string[];
  taxableComponentCodes: string[];
  pensionBaseComponentCodes: string[];
  deductionComponentCodes: string[];
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const payrollFormulaVersionSchema = new Schema<IPayrollFormulaVersion>(
  {
    version: { type: Number, required: true },
    isCurrent: { type: Boolean, default: false },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    grossComponentCodes: [{ type: String, required: true }],
    taxableComponentCodes: [{ type: String, required: true }],
    pensionBaseComponentCodes: [{ type: String, required: true }],
    deductionComponentCodes: [{ type: String, required: true }],
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

payrollFormulaVersionSchema.index({ isCurrent: 1 });
payrollFormulaVersionSchema.index({ version: 1 }, { unique: true });

export const PayrollFormulaVersion = mongoose.model<IPayrollFormulaVersion>(
  'PayrollFormulaVersion',
  payrollFormulaVersionSchema
);
