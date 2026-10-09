/**
 * STAFF PAYROLL ENGINE — pure calculation implementing the frozen company
 * spreadsheet formula. Shared statutory helpers are reused (progressive tax,
 * pension); nothing here reads or writes the database.
 *
 *   1. Gross Earnings   = Basic + Responsibility + Tele + NonTaxTransport + TaxTransport + OT
 *   2. Taxable Earnings = Basic + Responsibility + Tele + TaxTransport + OT
 *                          (Non-taxable transport NEVER enters taxable income)
 *   3. Pension          = Basic × 7% (employee) / Basic × 11% (employer)
 *                          Basic ONLY — never allowances, OT or bonus.
 *                          contract.pensionEnrolled = false → both are 0.
 *   4. Income Tax       = staff progressive table applied to Taxable Earnings
 *   5. Total Deduction  = Income Tax + Employee Pension + Penalty + Loan(s)
 *   6. Net Pay          = Gross − Total Deduction
 *   7. BONUS            = completely OUTSIDE the formula — not taxed, not
 *                          pensionable, not in gross, not in deductions.
 *                          Final Amount Paid = Net Pay + Bonus.
 */
export interface StaffContractInput {
    contractId: string;
    basic: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableTransport: number;
    pensionEnrolled: boolean;
}
export interface StaffEngineDeduction {
    deductionId: string;
    type: string;
    label: string;
    amount: number;
}
export interface StaffEngineInput {
    contract: StaffContractInput;
    /** Total overtime pay (ETB) for the period. */
    overtimeAmount: number;
    /** Total bonus (ETB) for the period — applied OUTSIDE the formula. */
    bonusAmount: number;
    deductions: StaffEngineDeduction[];
    taxBrackets: {
        min: number;
        max: number | null;
        rate: number;
    }[];
    pension: {
        employeePercent: number;
        employerPercent: number;
        minPensionableSalary?: number | null;
        maxPensionableSalary?: number | null;
    } | null;
}
export interface StaffPayrollCalculation {
    overtimeAmount: number;
    bonusAmount: number;
    grossEarnings: number;
    taxableEarnings: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    deductions: StaffEngineDeduction[];
    totalDeductions: number;
    netPay: number;
    bonus: number;
    finalAmountPaid: number;
    warnings: string[];
}
export declare const round2: (n: number) => number;
export declare function computeStaffPayroll(input: StaffEngineInput): StaffPayrollCalculation;
//# sourceMappingURL=staffPayrollEngine.d.ts.map