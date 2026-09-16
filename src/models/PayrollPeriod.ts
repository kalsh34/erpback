import mongoose, { Schema, Document } from 'mongoose';
import { PayrollPeriodStatus } from '../types';

export interface IPayrollPeriod extends Document {
  year: number;
  month: number;
  monthName: string;
  startDate: Date;
  endDate: Date;
  status: PayrollPeriodStatus;
  lockedAt?: Date;
  lockedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const payrollPeriodSchema = new Schema<IPayrollPeriod>(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    monthName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(PayrollPeriodStatus), default: PayrollPeriodStatus.DRAFT },
    lockedAt: { type: Date },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

payrollPeriodSchema.index({ year: 1, month: 1 }, { unique: true });
payrollPeriodSchema.index({ status: 1 });

export const PayrollPeriod = mongoose.model<IPayrollPeriod>('PayrollPeriod', payrollPeriodSchema);
