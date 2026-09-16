import mongoose, { Schema, Document } from 'mongoose';

export interface ISecondaryShiftEntry extends Document {
  guardId: mongoose.Types.ObjectId;
  payrollPeriodId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  rate: number;
  totalPay: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const secondaryShiftEntrySchema = new Schema<ISecondaryShiftEntry>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true },
    rate: { type: Number, required: true },
    totalPay: { type: Number, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

secondaryShiftEntrySchema.index({ guardId: 1, payrollPeriodId: 1 });

export const SecondaryShiftEntry = mongoose.model<ISecondaryShiftEntry>(
  'SecondaryShiftEntry',
  secondaryShiftEntrySchema
);
