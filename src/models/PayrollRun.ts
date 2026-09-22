import mongoose, { Schema, Document } from 'mongoose';

export enum PayrollRunStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum PayrollRunType {
  GUARD = 'GUARD',
  STAFF = 'STAFF',
  ALL = 'ALL',
}

export interface IPayrollRun extends Document {
  name: string;
  runType: PayrollRunType;
  // Single-period selection OR a range of periods
  periodFrom: mongoose.Types.ObjectId; // ref PayrollPeriod
  periodTo?: mongoose.Types.ObjectId; // ref PayrollPeriod (range end)
  periodIds: mongoose.Types.ObjectId[]; // resolved periods covered by this run
  periodLabel: string; // human-readable, e.g. "Tir 2013" or "Tir 2013 - Yeka 2013"

  status: PayrollRunStatus;

  totalGross: number;
  totalNet: number;
  employeeCount: number;

  createdBy?: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  paymentMethod?: string;
  bankReference?: string;

  createdAt: Date;
  updatedAt: Date;
}

const payrollRunSchema = new Schema<IPayrollRun>(
  {
    name: { type: String, required: true, trim: true },
    runType: { type: String, enum: Object.values(PayrollRunType), default: PayrollRunType.ALL },
    periodFrom: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    periodTo: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', default: null },
    periodIds: [{ type: Schema.Types.ObjectId, ref: 'PayrollPeriod' }],
    periodLabel: { type: String, required: true },
    status: { type: String, enum: Object.values(PayrollRunStatus), default: PayrollRunStatus.DRAFT },
    totalGross: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    bankReference: { type: String },
  },
  { timestamps: true }
);

payrollRunSchema.index({ status: 1 });
payrollRunSchema.index({ createdAt: -1 });

export const PayrollRun = mongoose.model<IPayrollRun>('PayrollRun', payrollRunSchema);