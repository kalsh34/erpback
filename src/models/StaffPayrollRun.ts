import mongoose, { Schema, Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';

/**
 * STAFF PAYROLL RUN — one office-staff payroll month.
 *
 * Lifecycle: DRAFT → CALCULATED → SUBMITTED → CHECKED → APPROVED → PAID
 * (plus RETURNED for corrections; recalculation only while DRAFT / CALCULATED /
 * RETURNED). Mirrors the guard payroll lifecycle so the two systems behave the
 * same way, while staying a separate system with its own records.
 *
 * Staff payroll is contract-driven (no attendance hours), so unlike guard
 * payroll it does not lock staff attendance.
 */
export interface IStaffPayrollProblem {
  employeeId: mongoose.Types.ObjectId;
  employeeCode: string;
  employeeName: string;
  code: 'NO_ACTIVE_CONTRACT' | 'MULTIPLE_ACTIVE_CONTRACTS';
  message: string;
}

export interface IStaffPayrollRun extends Document {
  periodKey: string; // "YYYY-MM"
  status: PayrollRecordStatus;
  problems: IStaffPayrollProblem[];
  totals: {
    employees: number;
    grossEarnings: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    totalDeductions: number;
    netPay: number;
    bonus: number;
    finalAmountPaid: number;
  };
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
  returnedBy?: mongoose.Types.ObjectId;
  returnedAt?: Date;
  returnReason?: string;
  returnHistory: { reason: string; by: mongoose.Types.ObjectId; at: Date; fromStatus: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const staffPayrollRunSchema = new Schema<IStaffPayrollRun>(
  {
    periodKey: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
    status: { type: String, enum: Object.values(PayrollRecordStatus), default: PayrollRecordStatus.DRAFT },
    problems: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        employeeCode: String,
        employeeName: String,
        code: { type: String, enum: ['NO_ACTIVE_CONTRACT', 'MULTIPLE_ACTIVE_CONTRACTS'] },
        message: String,
      },
    ],
    totals: {
      employees: { type: Number, default: 0 },
      grossEarnings: { type: Number, default: 0 },
      employeePension: { type: Number, default: 0 },
      employerPension: { type: Number, default: 0 },
      incomeTax: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
      netPay: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      finalAmountPaid: { type: Number, default: 0 },
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
    returnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnedAt: { type: Date },
    returnReason: { type: String, trim: true },
    returnHistory: [{ reason: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, at: Date, fromStatus: String }],
  },
  { timestamps: true }
);

export const StaffPayrollRun = mongoose.model<IStaffPayrollRun>('StaffPayrollRun', staffPayrollRunSchema);
