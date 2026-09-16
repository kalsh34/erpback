import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollApproval extends Document {
  payrollRecordId: mongoose.Types.ObjectId;
  payrollType: 'GUARD' | 'STAFF';
  action: string;
  performedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const payrollApprovalSchema = new Schema<IPayrollApproval>(
  {
    payrollRecordId: { type: Schema.Types.ObjectId, required: true },
    payrollType: { type: String, enum: ['GUARD', 'STAFF'], required: true },
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

payrollApprovalSchema.index({ payrollRecordId: 1 });

export const PayrollApproval = mongoose.model<IPayrollApproval>('PayrollApproval', payrollApprovalSchema);
