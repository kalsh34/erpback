import mongoose, { Schema, Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';

/**
 * STAFF PAYROLL RECORD — immutable snapshot of one employee's payroll for one
 * run/period. Every input actually used is preserved (contract pay fields,
 * overtime, bonus, deductions, statutory config), so finalized payroll never
 * changes when the employee's contract or the statutory tables change later.
 *
 * FORMULA (company spreadsheet, frozen):
 *   Gross    = Basic + Responsibility + Tele + NonTaxTransport + TaxTransport + OT
 *   Taxable  = Basic + Responsibility + Tele + TaxTransport + OT        (no non-tax transport)
 *   Pension  = Basic × 7% / 11%   (Basic ONLY; 0 when contract.pensionEnrolled = false)
 *   Tax      = progressive staff table applied to Taxable
 *   Deduct.  = Income Tax + Employee Pension + Penalty + Loan(s)
 *   Net Pay  = Gross − Total Deduction
 *   BONUS    = completely OUTSIDE the formula — never taxed, never pensionable,
 *              never in gross or deductions. Final Amount Paid = Net Pay + Bonus.
 */
export interface IStaffPayrollRecord extends Document {
  runId: mongoose.Types.ObjectId;
  periodKey: string;
  employeeId: mongoose.Types.ObjectId;
  snapshot: {
    employeeCode: string;
    fullName: string;
    department?: string;
    jobPosition?: string;
    contractId: string;
    contractType?: string;
    // Pay inputs as of calculation time (ETB/month):
    basic: number; // Contract.wage
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableTransport: number; // Contract.nonTaxableAllowance
    pensionEnrolled: boolean;
    bankName?: string;
    accountNumber?: string;
  };
  overtimeAmount: number;
  bonusAmount: number;
  grossEarnings: number;
  taxableEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  deductions: { deductionId: mongoose.Types.ObjectId; type: string; label: string; amount: number }[];
  totalDeductions: number;
  netPay: number;
  bonus: number;
  finalAmountPaid: number;
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

const staffPayrollRecordSchema = new Schema<IStaffPayrollRecord>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'StaffPayrollRun', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    snapshot: {
      employeeCode: { type: String, required: true },
      fullName: { type: String, required: true },
      department: { type: String },
      jobPosition: { type: String },
      contractId: { type: String, required: true },
      contractType: { type: String },
      basic: { type: Number, required: true, min: 0 },
      responsibilityAllowance: { type: Number, required: true, min: 0 },
      teleAllowance: { type: Number, required: true, min: 0 },
      taxableTransport: { type: Number, required: true, min: 0 },
      nonTaxableTransport: { type: Number, required: true, min: 0 },
      pensionEnrolled: { type: Boolean, required: true },
      bankName: { type: String },
      accountNumber: { type: String },
    },
    overtimeAmount: { type: Number, required: true, min: 0 },
    bonusAmount: { type: Number, required: true, min: 0 },
    grossEarnings: { type: Number, required: true },
    taxableEarnings: { type: Number, required: true },
    employeePension: { type: Number, required: true, min: 0 },
    employerPension: { type: Number, required: true, min: 0 },
    incomeTax: { type: Number, required: true, min: 0 },
    deductions: [{
      deductionId: { type: Schema.Types.ObjectId, ref: 'EmployeeDeduction', required: true },
      type: { type: String, required: true },
      label: { type: String, required: true },
      amount: { type: Number, required: true },
    }],
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true },
    bonus: { type: Number, required: true, min: 0 },
    finalAmountPaid: { type: Number, required: true },
    warnings: { type: [String], default: [] },
  },
  { timestamps: true }
);

staffPayrollRecordSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
staffPayrollRecordSchema.index({ employeeId: 1, periodKey: 1 });

export const StaffPayrollRecord = mongoose.model<IStaffPayrollRecord>('StaffPayrollRecord', staffPayrollRecordSchema);
