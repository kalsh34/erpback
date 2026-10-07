import mongoose, { Document } from 'mongoose';
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
        basic: number;
        responsibilityAllowance: number;
        teleAllowance: number;
        taxableTransport: number;
        nonTaxableTransport: number;
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
    deductions: {
        deductionId: mongoose.Types.ObjectId;
        type: string;
        label: string;
        amount: number;
    }[];
    totalDeductions: number;
    netPay: number;
    bonus: number;
    finalAmountPaid: number;
    warnings: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const StaffPayrollRecord: mongoose.Model<IStaffPayrollRecord, {}, {}, {}, mongoose.Document<unknown, {}, IStaffPayrollRecord, {}, {}> & IStaffPayrollRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=StaffPayrollRecord.d.ts.map