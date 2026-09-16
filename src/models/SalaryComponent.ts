import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryComponent extends Document {
  code: string;
  label: string;
  sourceType: 'CONTRACT' | 'HR_MONTHLY_INPUT';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const salaryComponentSchema = new Schema<ISalaryComponent>(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    label: { type: String, required: true, trim: true },
    sourceType: { type: String, enum: ['CONTRACT', 'HR_MONTHLY_INPUT'], required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

salaryComponentSchema.index({ active: 1 });
salaryComponentSchema.index({ code: 1 }, { unique: true });

export const SalaryComponent = mongoose.model<ISalaryComponent>(
  'SalaryComponent',
  salaryComponentSchema
);
