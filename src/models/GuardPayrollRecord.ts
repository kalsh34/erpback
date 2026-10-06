import mongoose, { Schema, Document } from 'mongoose';

/**
 * GUARD PAYROLL RECORD — the immutable monthly snapshot for ONE guard.
 *
 * Every value used by the calculation is copied in here (site, primary /
 * additional status, compensation, transport %, OT rate, basic salary,
 * basic hourly rate, normal/holiday/Sunday hours, site earnings, pension
 * base, taxable earnings, tax, deductions, net pay). Finalized payroll NEVER
 * changes when contracts, assignments, compensations or attendance change
 * later — the record is the historical evidence.
 *
 * One record per guard per run (unique runId + employeeId).
 */

export interface IPrimarySiteSnapshot {
  siteId: mongoose.Types.ObjectId;
  siteName: string;
  siteCode?: string;
  compensationAmount: number;
  transportPercent: number;
  standardMonthlyHours: number;
  sundayStructuralHours: number;
  basicHourlyDivisor: number;
  otRate: number;
  sundayStructuralAllocation: number;
  remaining: number;
  transportFull: number;
  basicSalary: number;
  basicHourlyRate: number;
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  normalPay: number;
  holidayPay: number;
  sundayPay: number;
  transportPaid: number;
  siteEarnings: number;
}

export interface IAdditionalSiteSnapshot {
  siteId: mongoose.Types.ObjectId;
  siteName: string;
  siteCode?: string;
  compensationAmount: number;
  otRate: number;
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  totalHours: number;
  siteEarnings: number;
}

export interface IGuardPayrollRecord extends Document {
  runId: mongoose.Types.ObjectId;
  periodKey: string;
  employeeId: mongoose.Types.ObjectId;
  snapshot: {
    employeeCode: string;
    fullName: string;
    bankName?: string;
    accountNumber?: string;
    pensionEnrolled: boolean;
    contractType?: string;
    contractWage?: number;
  };
  primarySite: IPrimarySiteSnapshot;
  additionalSites: IAdditionalSiteSnapshot[];
  /** Primary + all additional site earnings, before any deduction. */
  grossEarnings: number;
  /** Primary-site salary base only (transport and additional sites excluded). */
  pensionBase: number;
  /** All sites, transport excluded, minus employee pension withheld. */
  taxableEarnings: number;
  employeePension: number;
  employerPension: number;
  incomeTax: number;
  deductions: {
    deductionId: mongoose.Types.ObjectId;
    type: string;
    label: string;
    amount: number;
  }[];
  totalDeductions: number;
  netPay: number;
  /** Non-blocking notes (missing contract, additional site without rate, …). */
  warnings: string[];
  createdAt: Date;
  updatedAt: Date;
}

const guardPayrollRecordSchema = new Schema<IGuardPayrollRecord>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'GuardPayrollRun', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    snapshot: {
      employeeCode: { type: String, required: true },
      fullName: { type: String, required: true },
      bankName: { type: String },
      accountNumber: { type: String },
      pensionEnrolled: { type: Boolean, default: false },
      contractType: { type: String },
      contractWage: { type: Number },
    },
    primarySite: {
      siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
      siteName: { type: String, required: true },
      siteCode: { type: String },
      compensationAmount: { type: Number, required: true },
      transportPercent: { type: Number, required: true },
      standardMonthlyHours: { type: Number, required: true },
      sundayStructuralHours: { type: Number, required: true },
      basicHourlyDivisor: { type: Number, required: true },
      otRate: { type: Number, required: true },
      sundayStructuralAllocation: { type: Number, required: true },
      remaining: { type: Number, required: true },
      transportFull: { type: Number, required: true },
      basicSalary: { type: Number, required: true },
      basicHourlyRate: { type: Number, required: true },
      normalHours: { type: Number, default: 0 },
      holidayHours: { type: Number, default: 0 },
      sundayHours: { type: Number, default: 0 },
      normalPay: { type: Number, default: 0 },
      holidayPay: { type: Number, default: 0 },
      sundayPay: { type: Number, default: 0 },
      transportPaid: { type: Number, default: 0 },
      siteEarnings: { type: Number, default: 0 },
    },
    additionalSites: [{
      siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
      siteName: { type: String, required: true },
      siteCode: { type: String },
      compensationAmount: { type: Number, required: true },
      otRate: { type: Number, required: true },
      normalHours: { type: Number, default: 0 },
      holidayHours: { type: Number, default: 0 },
      sundayHours: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      siteEarnings: { type: Number, default: 0 },
    }],
    grossEarnings: { type: Number, default: 0 },
    pensionBase: { type: Number, default: 0 },
    taxableEarnings: { type: Number, default: 0 },
    employeePension: { type: Number, default: 0 },
    employerPension: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    deductions: [{
      deductionId: { type: Schema.Types.ObjectId, ref: 'EmployeeDeduction', required: true },
      type: { type: String, required: true },
      label: { type: String, required: true },
      amount: { type: Number, required: true },
    }],
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    warnings: [{ type: String }],
  },
  { timestamps: true }
);

guardPayrollRecordSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
guardPayrollRecordSchema.index({ employeeId: 1, periodKey: 1 });

export const GuardPayrollRecord = mongoose.model<IGuardPayrollRecord>(
  'GuardPayrollRecord',
  guardPayrollRecordSchema
);
