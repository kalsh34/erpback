import mongoose, { Schema, Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';

export interface IStaffPayrollRecord extends Document {
  payrollPeriodId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  formulaVersionId?: mongoose.Types.ObjectId;

  basicSalary: number;
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableTransport: number;
  overtime: number;
  regularOtHours: number;
  holidayOtHours: number;
  regularOtPay: number;
  holidayOtPay: number;
  bonus: number;
  penalty: number;
  grossSalary: number;

  taxableSalary: number;
  incomeTax: number;
  employeePension: number;
  employerPension: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;

  status: PayrollRecordStatus;

  submittedBy?: mongoose.Types.ObjectId;
  submittedAt?: Date;
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

  attendanceDataMissing: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const staffPayrollRecordSchema = new Schema<IStaffPayrollRecord>(
  {
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    formulaVersionId: { type: Schema.Types.ObjectId, ref: 'PayrollFormulaVersion' },

    basicSalary: { type: Number, default: 0 },
    responsibilityAllowance: { type: Number, default: 0 },
    teleAllowance: { type: Number, default: 0 },
    taxableTransport: { type: Number, default: 0 },
    nonTaxableTransport: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    regularOtHours: { type: Number, default: 0 },
    holidayOtHours: { type: Number, default: 0 },
    regularOtPay: { type: Number, default: 0 },
    holidayOtPay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    taxableSalary: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    employeePension: { type: Number, default: 0 },
    employerPension: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },

    status: { type: String, enum: Object.values(PayrollRecordStatus), default: PayrollRecordStatus.DRAFT },

    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
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

    attendanceDataMissing: { type: Boolean, default: false },
  },
  { timestamps: true }
);

staffPayrollRecordSchema.index({ payrollPeriodId: 1, employeeId: 1 }, { unique: true });
staffPayrollRecordSchema.index({ status: 1 });

export const StaffPayrollRecord = mongoose.model<IStaffPayrollRecord>(
  'StaffPayrollRecord',
  staffPayrollRecordSchema
);
