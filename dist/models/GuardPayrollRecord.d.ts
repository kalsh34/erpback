import mongoose, { Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';
/**
 * Per-site earnings breakdown for one guard in one payroll period.
 * Preserves site identity end-to-end: hours and rates are never merged
 * across sites, and each site is priced with its own rate.
 */
export interface IGuardSiteEarning {
    siteId: mongoose.Types.ObjectId | null;
    siteName?: string;
    isPrimary: boolean;
    normalHours: number;
    holidayHours: number;
    normalRate: number;
    holidayRate: number;
    normalEarnings: number;
    holidayEarnings: number;
    /** True when this is an additional site and no GuardSiteRate exists yet. */
    rateMissing: boolean;
}
/** A manual payroll override with full audit trail (spec §21). */
export interface IPayrollOverride {
    field: 'grossPay' | 'netPay';
    originalValue: number;
    overrideValue: number;
    reason: string;
    by: mongoose.Types.ObjectId;
    at: Date;
}
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
    contractSalary: number;
    expectedMonthlyHours: number;
    primaryHourlyRate: number;
    siteEarnings: IGuardSiteEarning[];
    primaryEarnings: number;
    additionalEarnings: number;
    allowances: {
        label: string;
        amount: number;
        taxable: boolean;
    }[];
    allowanceTotal: number;
    nonTaxableAllowances: number;
    grossEarnings: number;
    rateMissing: boolean;
    validationErrors: string[];
    /** Input echo at calculation time — historical records stay reproducible. */
    snapshot?: Record<string, unknown>;
    calculatedGrossPay?: number;
    calculatedNetPay?: number;
    overrides: IPayrollOverride[];
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
export declare const GuardPayrollRecord: mongoose.Model<IGuardPayrollRecord, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPayrollRecord, {}, {}> & IGuardPayrollRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPayrollRecord.d.ts.map