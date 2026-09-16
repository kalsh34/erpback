import mongoose, { Schema, Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';

export interface IGuardPayrollRecord extends Document {
  payrollPeriodId: mongoose.Types.ObjectId;
  guardId: mongoose.Types.ObjectId;
  primarySiteId?: mongoose.Types.ObjectId;
  standardMonthlyHours: number;

  normalHours: number;
  otHours: number;
  regularOtHours: number;
  holidayOtHours: number;
  holidayHours: number;
  secondaryShiftPay: number;

  normalRate: number;
  otRate: number;
  holidayRate: number;
  holidayOtRate: number;

  normalSalary: number;
  workedSalary: number;
  otPay: number;
  regularOtPay: number;
  holidayOtPay: number;
  holidayPay: number;
  grossPay: number;

  baseComponent: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  loanDeduction: number;
  totalDeductions: number;
  netPay: number;

  status: PayrollRecordStatus;

  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
  rateEnteredBy?: mongoose.Types.ObjectId;
  rateEnteredAt?: Date;
  calculatedBy?: mongoose.Types.ObjectId;
  calculatedAt?: Date;
  checkedBy?: mongoose.Types.ObjectId;
  checkedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  paidBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  returnedBy?: mongoose.Types.ObjectId;
  returnedAt?: Date;
  returnReason?: string;

  paymentDate?: Date;
  paymentMethod?: string;
  bankReference?: string;

  createdAt: Date;
  updatedAt: Date;
}

const guardPayrollRecordSchema = new Schema<IGuardPayrollRecord>(
  {
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    primarySiteId: { type: Schema.Types.ObjectId, ref: 'Site', default: null },
    standardMonthlyHours: { type: Number, required: true },

    normalHours: { type: Number, default: 0 },
    otHours: { type: Number, default: 0 },
    regularOtHours: { type: Number, default: 0 },
    holidayOtHours: { type: Number, default: 0 },
    holidayHours: { type: Number, default: 0 },
    secondaryShiftPay: { type: Number, default: 0 },

    normalRate: { type: Number, default: 0 },
    otRate: { type: Number, default: 0 },
    holidayRate: { type: Number, default: 0 },
    holidayOtRate: { type: Number, default: 0 },

    normalSalary: { type: Number, default: 0 },
    workedSalary: { type: Number, default: 0 },
    otPay: { type: Number, default: 0 },
    regularOtPay: { type: Number, default: 0 },
    holidayOtPay: { type: Number, default: 0 },
    holidayPay: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },

    baseComponent: { type: Number, default: 0 },
    employeePension: { type: Number, default: 0 },
    employerPension: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(PayrollRecordStatus), default: PayrollRecordStatus.DRAFT },

    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    rateEnteredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rateEnteredAt: { type: Date },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    calculatedAt: { type: Date },
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    returnedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnedAt: { type: Date },
    returnReason: { type: String },

    paymentDate: { type: Date },
    paymentMethod: { type: String },
    bankReference: { type: String },
  },
  { timestamps: true }
);

guardPayrollRecordSchema.index({ payrollPeriodId: 1, guardId: 1 }, { unique: true });
guardPayrollRecordSchema.index({ status: 1 });

export const GuardPayrollRecord = mongoose.model<IGuardPayrollRecord>(
  'GuardPayrollRecord',
  guardPayrollRecordSchema
);
