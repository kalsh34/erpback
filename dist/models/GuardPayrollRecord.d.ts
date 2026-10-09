import mongoose, { Document } from 'mongoose';
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
export declare const GuardPayrollRecord: mongoose.Model<IGuardPayrollRecord, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPayrollRecord, {}, {}> & IGuardPayrollRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPayrollRecord.d.ts.map