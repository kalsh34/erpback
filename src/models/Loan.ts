import mongoose, { Schema, Document } from 'mongoose';
import { LoanStatus } from '../types';

export interface ILoan extends Document {
  employeeId: mongoose.Types.ObjectId;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  monthlyDeduction: number;
  status: LoanStatus;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const loanSchema = new Schema<ILoan>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    monthlyDeduction: { type: Number, required: true },
    status: { type: String, enum: Object.values(LoanStatus), default: LoanStatus.ACTIVE },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

loanSchema.index({ employeeId: 1, status: 1 });

export const Loan = mongoose.model<ILoan>('Loan', loanSchema);
