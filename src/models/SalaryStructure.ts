import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryStructureEarning {
  componentCode: string;
  label: string;
  calculationType: 'HOURLY_RATE' | 'FIXED_AMOUNT' | 'PERCENTAGE';
  defaultRate: number;
  taxable: boolean;
  required: boolean;
}

export interface ISalaryStructureDeduction {
  componentCode: string;
  label: string;
  calculationType: string;
  defaultValue: number;
  enabled: boolean;
}

export interface ISalaryStructure extends Document {
  name: string;
  employeeType: 'GUARD' | 'STAFF';
  payBasis: 'HOURLY' | 'MONTHLY';
  version: number;
  isCurrent: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
  otMultiplier: number;
  holidayMultiplier: number;
  holidayOtMultiplier: number;
  earnings: ISalaryStructureEarning[];
  deductions: ISalaryStructureDeduction[];
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const salaryStructureSchema = new Schema<ISalaryStructure>(
  {
    name: { type: String, required: true, trim: true },
    employeeType: { type: String, enum: ['GUARD', 'STAFF'], required: true },
    payBasis: { type: String, enum: ['HOURLY', 'MONTHLY'], required: true },
    version: { type: Number, required: true },
    isCurrent: { type: Boolean, default: false },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    otMultiplier: { type: Number, default: 1.5 },
    holidayMultiplier: { type: Number, default: 2.0 },
    holidayOtMultiplier: { type: Number, default: 2.5 },
    earnings: [
      {
        componentCode: { type: String, required: true },
        label: { type: String, required: true },
        calculationType: { type: String, enum: ['HOURLY_RATE', 'FIXED_AMOUNT', 'PERCENTAGE'], required: true },
        defaultRate: { type: Number, required: true, default: 0 },
        taxable: { type: Boolean, default: false },
        required: { type: Boolean, default: false },
      },
    ],
    deductions: [
      {
        componentCode: { type: String, required: true },
        label: { type: String, required: true },
        calculationType: { type: String, default: 'FIXED_AMOUNT' },
        defaultValue: { type: Number, default: 0 },
        enabled: { type: Boolean, default: true },
      },
    ],
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

salaryStructureSchema.index({ isCurrent: 1 });
salaryStructureSchema.index({ employeeType: 1 });
salaryStructureSchema.index({ employeeType: 1, version: 1 }, { unique: true });

export const SalaryStructure = mongoose.model<ISalaryStructure>(
  'SalaryStructure',
  salaryStructureSchema
);
