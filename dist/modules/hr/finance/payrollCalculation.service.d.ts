import mongoose from 'mongoose';
import { IGuardPayrollRecord, IGuardSiteEarning } from '../../../models/GuardPayrollRecord';
import { IStaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { IPayrollFormulaVersion } from '../../../models/PayrollFormulaVersion';
import { ISalaryStructure } from '../../../models/SalaryStructure';
export declare class PayrollCalculationService {
    static calculateIncomeTax(taxableSalary: number, effectiveDate?: Date): Promise<number>;
    static calculatePension(baseAmount: number, effectiveDate?: Date): Promise<{
        employeePension: number;
        employerPension: number;
        pensionTaxBase: "NORMAL_SALARY_ONLY" | "GROSS_PAY";
    }>;
    static getCurrentFormula(asOf?: Date): Promise<IPayrollFormulaVersion>;
    static getActiveSalaryStructure(employeeType: 'GUARD' | 'STAFF', asOf?: Date): Promise<ISalaryStructure | null>;
    static getComponentValue(record: any, code: string): number;
    /**
     * Resolve the effective earning rate for a guard's PRIMARY site (spec §7).
     * Primary rate = contract salary ÷ expected monthly hours (assignment config
     * first, DEFAULT_EXPECTED_MONTHLY_HOURS fallback). Multipliers for OT/holiday
     * come from the active salary structure.
     */
    static resolveGuardRates(guardId: any, assignment: any, asOf?: Date): Promise<{
        normalRate: number;
        otRate: number;
        holidayRate: number;
        holidayOtRate: number;
        standardMonthlyHours: number;
        expectedMonthlyHours: number;
        contractSalary: number;
        pensionEnrolled: boolean;
    }>;
    /**
     * The guard's Primary Site assignment in effect during the payroll period.
     * The `isPrimary` flag on the assignment wins (Operations can change it);
     * otherwise the most recent overlapping `effectiveFrom` decides (spec §11/§14).
     */
    static getPeriodPrimaryAssignment(guardId: any, periodStart: Date, periodEnd: Date): Promise<mongoose.Document<unknown, {}, import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment, {}, {}> & import("../../../models/PrimarySiteAssignment").IPrimarySiteAssignment & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Build the per-site earnings breakdown for a guard over a payroll period
     * (spec §2/§4): hours grouped BY SITE from validated daily attendance —
     * Guard → Site → Month → Total Hours. The primary site is always present
     * (flagged `isPrimary`) even when it has no hours yet, priced at the
     * contract rate; additional sites are priced at their GuardSiteRate
     * (flagged rateMissing when Finance has not entered one yet).
     */
    static buildSiteEarnings(opts: {
        guardId: any;
        periodStart: Date;
        periodEnd: Date;
        payrollPeriodId: any;
        primarySiteId: any;
        primaryNormalRate: number;
        primaryHolidayRate: number;
    }): Promise<{
        siteEarnings: IGuardSiteEarning[];
        validationErrors: string[];
        rateMissing: boolean;
    }>;
    /** Contract allowances, paid ONCE per period — never × sites or hours (spec §8). */
    static buildGuardAllowances(contract: any, assignment: any): {
        label: string;
        amount: number;
        taxable: boolean;
    }[];
    static calculateGuardPayroll(recordId: string): Promise<IGuardPayrollRecord>;
    static calculateStaffPayroll(recordId: string): Promise<IStaffPayrollRecord>;
    /**
     * Total loan deduction for an employee as of a date.
     * Respects: loan status ACTIVE, startDate, optional endDate, and remaining balance
     * (never deducts more than what is still owed).
     */
    static getActiveLoanDeduction(employeeId: any, asOf: Date): Promise<number>;
    /**
     * Apply a loan repayment across the employee's active loans (oldest first):
     * increments paidAmount, decrements balance, and marks loans PAID_OFF when settled.
     */
    static applyLoanRepayment(employeeId: any, amount: number, asOf: Date): Promise<void>;
    static generateGuardPayrollRecords(payrollPeriodId: string): Promise<IGuardPayrollRecord[]>;
    /**
     * Payable-day calendar (spec §5): Mon–Fri = 1, Sat = 0.5, Sun = 0.
     * No hardcoded 22/26/30 divisors anywhere.
     */
    static calendarDayValue(d: Date): number;
    /** Status → payable value for a day, capped at the calendar value. */
    static statusDayValue(status: string, calendarValue: number): number;
    static generateStaffPayrollRecords(payrollPeriodId: string): Promise<{
        records: IStaffPayrollRecord[];
        skipped: {
            employeeId: string;
            firstName: string;
            lastName: string;
            employeeCode: string;
            reason: string;
        }[];
    }>;
}
//# sourceMappingURL=payrollCalculation.service.d.ts.map