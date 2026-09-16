import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollRate extends Document {
  payrollPeriodId: mongoose.Types.ObjectId;
  normalRate: number;
  otRate: number;
  holidayRate: number;
  setBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const payrollRateSchema = new Schema<IPayrollRate>(
  {
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true, unique: true },
    normalRate: { type: Number, required: true },
    otRate: { type: Number, required: true },
    holidayRate: { type: Number, required: true },
    setBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const PayrollRate = mongoose.model<IPayrollRate>('PayrollRate', payrollRateSchema);
