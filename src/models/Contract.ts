import mongoose, { Schema, Document } from 'mongoose';

export interface IContract extends Document {
  employeeId: mongoose.Types.ObjectId;
  salaryStructureId?: mongoose.Types.ObjectId;
  contractStartDate: Date;
  contractEndDate?: Date;
  department?: string;
  grade?: string;
  jobPosition?: string;
  contractType: string;
  wage: number;
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableAllowance: number;
  transportAllowance: number;
  pensionEnrolled: boolean;
  notes?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  createdAt: Date;
  updatedAt: Date;
}

const contractSchema = new Schema<IContract>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    salaryStructureId: { type: Schema.Types.ObjectId, ref: 'SalaryStructure' },
    contractStartDate: { type: Date, required: true },
    contractEndDate: { type: Date },
    department: { type: String, trim: true },
    grade: { type: String, trim: true },
    jobPosition: { type: String, trim: true },
    contractType: { type: String, required: true, default: 'Full-Time' },
    wage: { type: Number, required: true, default: 0 },
    responsibilityAllowance: { type: Number, default: 0 },
    teleAllowance: { type: Number, default: 0 },
    taxableTransport: { type: Number, default: 0 },
    nonTaxableAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    pensionEnrolled: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'TERMINATED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

contractSchema.index({ employeeId: 1 });
contractSchema.index({ status: 1 });

export const Contract = mongoose.model<IContract>('Contract', contractSchema);
