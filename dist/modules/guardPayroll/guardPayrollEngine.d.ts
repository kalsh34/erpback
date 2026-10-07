/**
 * GUARD PAYROLL ENGINE — pure calculation functions (no DB access).
 *
 * Approved business rules (2026-10):
 *
 * PRIMARY SITE (full Guard Site Compensation, from the site's effective-dated
 * compensation amount C):
 *   OT Rate                = C / standardMonthlyHours (240)
 *   Sunday Structural      = OT Rate × sundayStructuralHours (32)
 *   Remaining              = C − Sunday Structural
 *   Transport              = Remaining × transportPercent (20, configurable,
 *                            NOT taxable)  — primary site ONLY
 *   Basic Salary           = Remaining − Transport
 *   Basic Hourly Rate      = Basic Salary / basicHourlyDivisor (208, NOT 240)
 *
 *   Normal Pay             = Mon–Sat hours × Basic Hourly Rate
 *   Sunday Pay             = Sunday hours × OT Rate
 *   Holiday Pay            = Holiday hours × OT Rate
 *   Transport is paid when the guard worked at the primary site this month;
 *   a guard with zero attendance earns zero (no automatic full-month pay).
 *
 * ADDITIONAL SITES (no basic salary, no transport, never the primary rate):
 *   Additional Site Pay    = hours at that site × THAT site's OT Rate
 *   Each site is calculated independently, then aggregated.
 *
 * PENSION (user rule 2026-10): the primary-site NORMAL-HOUR pay ONLY — the
 * Sunday structural OT, holiday OT, additional-site earnings and transport are
 * ALL excluded from the pension base.
 *
 * INCOME TAX (user rule 2026-10): every pay from the primary site (normal +
 * Sunday OT + holiday OT) and all additional sites, transport excluded — the
 * STAFF tax schedule is applied, exactly like the staff salary calculation.
 * The employee pension is NOT subtracted from the tax base (like staff); it is
 * withheld as a separate deduction.
 *
 * Everything is attendance-driven: no proration, joining/leaving mid-month
 * simply means the guard has fewer hours that month.
 */
export interface PayrollConfigNumbers {
    transportPercent: number;
    standardMonthlyHours: number;
    sundayStructuralHours: number;
    basicHourlyDivisor: number;
}
export interface SiteHoursBuckets {
    normalHours: number;
    holidayHours: number;
    sundayHours: number;
}
export interface EngineSiteInput {
    siteId: string;
    compensationAmount: number;
    hours: SiteHoursBuckets;
}
export interface EngineDeductionInput {
    deductionId: string;
    type: string;
    label: string;
    amount: number;
}
export interface EnginePensionInput {
    employeePercent: number;
    employerPercent: number;
    minPensionableSalary?: number | null;
    maxPensionableSalary?: number | null;
}
export interface EngineTaxLine {
    min: number;
    max: number | null;
    rate: number;
}
export interface PrimarySiteCalculation extends SiteHoursBuckets {
    compensationAmount: number;
    transportPercent: number;
    otRate: number;
    sundayStructuralAllocation: number;
    remaining: number;
    transportFull: number;
    basicSalary: number;
    basicHourlyRate: number;
    normalPay: number;
    holidayPay: number;
    sundayPay: number;
    transportPaid: number;
    siteEarnings: number;
}
export interface AdditionalSiteCalculation extends SiteHoursBuckets {
    siteId: string;
    compensationAmount: number;
    otRate: number;
    totalHours: number;
    siteEarnings: number;
}
export interface EngineOutput {
    primary: PrimarySiteCalculation;
    additionalSites: AdditionalSiteCalculation[];
    grossEarnings: number;
    pensionBase: number;
    taxableEarnings: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    deductions: EngineDeductionInput[];
    totalDeductions: number;
    netPay: number;
}
export declare const round2: (n: number) => number;
export declare const round4: (n: number) => number;
/** One primary site's compensation decomposition — rates derive ONLY from the compensation amount. */
export declare function computePrimarySite(input: EngineSiteInput, config: PayrollConfigNumbers): PrimarySiteCalculation;
/** One additional site — hours × THAT site's OT rate. No basic, no transport. */
export declare function computeAdditionalSite(input: EngineSiteInput, config: PayrollConfigNumbers): AdditionalSiteCalculation;
export declare function computeGuardPayroll(input: {
    primary: EngineSiteInput;
    additionalSites: EngineSiteInput[];
    config: PayrollConfigNumbers;
    pensionEnrolled: boolean;
    pension: EnginePensionInput | null;
    taxBrackets: EngineTaxLine[];
    deductions: EngineDeductionInput[];
}): EngineOutput;
//# sourceMappingURL=guardPayrollEngine.d.ts.map