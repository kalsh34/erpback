import { IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
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
     * Resolve the effective earning rate for a guard component.
     * Priority: Contract.wage (monthly, divided by standard hours)
     *           → PrimarySiteAssignment.hourlyRate (already an HOURLY rate, used directly)
     *           → Structure BASIC defaultRate (monthly, divided by standard hours)
     *           → PayrollRate fallback (absolute hourly rates).
     */
    static resolveGuardRates(guardId: any, assignment: any, asOf?: Date): Promise<{
        normalRate: number;
        otRate: number;
        holidayRate: number;
        holidayOtRate: number;
        standardMonthlyHours: number;
    }>;
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