import mongoose, { Schema, Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';

/**
 * GUARD PAYROLL RUN — one payroll cycle for one calendar month (periodKey).
 * One run per month (unique index). The run carries the approval lifecycle;
 * the per-guard money lives in GuardPayrollRecord snapshots.
 *
 * Lifecycle: DRAFT → CALCULATED → SUBMITTED → CHECKED → APPROVED → PAID
 * (RETURNED re-opens a submitted run for correction and unlocks attendance).
 *
 * Locking rule: while the run is SUBMITTED or beyond, guard attendance for
 * that periodKey is locked — see GuardPayrollLockService.
 */
export interface IGuardPayrollRun extends Document {
  periodKey: string; // "YYYY-MM"
  status: PayrollRecordStatus;
  calculatedBy?: mongoose.Types.ObjectId;
  calculatedAt?: Date;
  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  checkedBy?: mongoose.Types.ObjectId;
  checkedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  paymentRef?: string;
  /** Guards that could not be calculated, with the reason (e.g. no primary site). */
  problems: {
    employeeId: mongoose.Types.ObjectId;
    employeeCode?: string;
    guardName?: string;
    code: string;
    message: string;
  }[];
  /** Audit trail of RETURN-for-correction actions. */
  returnHistory: {
    reason: string;
    returnedBy: mongoose.Types.ObjectId;
    returnedAt: Date;
  }[];
  totals: {
    guards: number;
    grossEarnings: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    totalDeductions: number;
    netPay: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const guardPayrollRunSchema = new Schema<IGuardPayrollRun>(
  {
    periodKey: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}$/,
    },
    status: {
      type: String,
      enum: Object.values(PayrollRecordStatus),
      default: PayrollRecordStatus.DRAFT,
    },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    calculatedAt: { type: Date },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    paymentRef: { type: String, trim: true },
    problems: [{
      employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
      employeeCode: { type: String },
      guardName: { type: String },
      code: { type: String, required: true },
      message: { type: String, required: true },
    }],
    returnHistory: [{
      reason: { type: String, required: true, trim: true },
      returnedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      returnedAt: { type: Date, default: Date.now },
    }],
    totals: {
      guards: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
      employeePension: { type: Number, default: 0 },
      employerPension: { type: Number, default: 0 },
      incomeTax: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      netPay: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const GuardPayrollRun = mongoose.model<IGuardPayrollRun>(
  'GuardPayrollRun',
  guardPayrollRunSchema
);
