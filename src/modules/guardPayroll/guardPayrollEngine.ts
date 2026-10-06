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

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** One primary site's compensation decomposition — rates derive ONLY from the compensation amount. */
export function computePrimarySite(input: EngineSiteInput, config: PayrollConfigNumbers): PrimarySiteCalculation {
  const { compensationAmount } = input;
  const hours = {
    normalHours: input.hours.normalHours || 0,
    holidayHours: input.hours.holidayHours || 0,
    sundayHours: input.hours.sundayHours || 0,
  };

  const otRate = round4(compensationAmount / config.standardMonthlyHours);
  const sundayStructuralAllocation = round2(otRate * config.sundayStructuralHours);
  const remaining = round2(compensationAmount - sundayStructuralAllocation);
  const transportFull = round2((remaining * config.transportPercent) / 100);
  const basicSalary = round2(remaining - transportFull);
  const basicHourlyRate = round4(basicSalary / config.basicHourlyDivisor);

  const normalPay = round2(hours.normalHours * basicHourlyRate);
  const holidayPay = round2(hours.holidayHours * otRate);
  const sundayPay = round2(hours.sundayHours * otRate);
  const primaryTaxable = round2(normalPay + holidayPay + sundayPay);

  // Transport belongs to the primary site and follows attendance: zero hours → zero earnings.
  const hasHours = hours.normalHours + hours.holidayHours + hours.sundayHours > 0;
  const transportPaid = hasHours ? transportFull : 0;

  return {
    ...hours,
    compensationAmount,
    transportPercent: config.transportPercent,
    otRate,
    sundayStructuralAllocation,
    remaining,
    transportFull,
    basicSalary,
    basicHourlyRate,
    normalPay,
    holidayPay,
    sundayPay,
    transportPaid,
    siteEarnings: round2(primaryTaxable + transportPaid),
  };
}

/** One additional site — hours × THAT site's OT rate. No basic, no transport. */
export function computeAdditionalSite(input: EngineSiteInput, config: PayrollConfigNumbers): AdditionalSiteCalculation {
  const hours = {
    normalHours: input.hours.normalHours || 0,
    holidayHours: input.hours.holidayHours || 0,
    sundayHours: input.hours.sundayHours || 0,
  };
  const otRate = round4(input.compensationAmount / config.standardMonthlyHours);
  const totalHours = round2(hours.normalHours + hours.holidayHours + hours.sundayHours);
  return {
    siteId: input.siteId,
    compensationAmount: input.compensationAmount,
    otRate,
    ...hours,
    totalHours,
    siteEarnings: round2(totalHours * otRate),
  };
}

export function computeGuardPayroll(input: {
  primary: EngineSiteInput;
  additionalSites: EngineSiteInput[];
  config: PayrollConfigNumbers;
  pensionEnrolled: boolean;
  pension: EnginePensionInput | null;
  taxBrackets: EngineTaxLine[];
  deductions: EngineDeductionInput[];
}): EngineOutput {
  const primary = computePrimarySite(input.primary, input.config);
  const additionalSites = (input.additionalSites || []).map((site) => computeAdditionalSite(site, input.config));

  const additionalTotal = round2(additionalSites.reduce((sum, s) => sum + s.siteEarnings, 0));
  const grossEarnings = round2(primary.siteEarnings + additionalTotal);

  // Pension base = primary-site NORMAL-HOUR pay ONLY (user rule 2026-10):
  // Sunday structural OT, holiday OT, additional sites and transport excluded.
  const pensionBase = input.pensionEnrolled && input.pension ? primary.normalPay : 0;

  let employeePension = 0;
  let employerPension = 0;
  if (input.pensionEnrolled && input.pension && pensionBase > 0) {
    const pension = roundPension(pensionBase, input.pension);
    employeePension = pension.employee;
    employerPension = pension.employer;
  }

  // Taxable = every pay from the primary site (normal + Sunday OT + holiday OT)
  // and all additional sites — transport excluded. Like the staff calculation,
  // the employee pension is NOT subtracted from the tax base (it is withheld
  // separately as a deduction).
  const taxableEarnings = round2(
    primary.normalPay + primary.holidayPay + primary.sundayPay + additionalTotal
  );
  const incomeTax = round2(computeProgressiveTax(taxableEarnings, input.taxBrackets));

  const deductions = (input.deductions || []).map((d) => ({ ...d, amount: round2(d.amount) }));
  const totalDeductions = round2(deductions.reduce((sum, d) => sum + d.amount, 0));

  const netPay = round2(grossEarnings - employeePension - incomeTax - totalDeductions);

  return {
    primary,
    additionalSites,
    grossEarnings,
    pensionBase,
    taxableEarnings,
    employeePension,
    employerPension,
    incomeTax,
    deductions,
    totalDeductions,
    netPay,
  };
}

function roundPension(base: number, rule: EnginePensionInput) {
  let pensionable = base;
  if (rule.minPensionableSalary !== null && rule.minPensionableSalary !== undefined) {
    pensionable = Math.max(pensionable, rule.minPensionableSalary);
  }
  if (rule.maxPensionableSalary !== null && rule.maxPensionableSalary !== undefined) {
    pensionable = Math.min(pensionable, rule.maxPensionableSalary);
  }
  return {
    employee: round2((pensionable * rule.employeePercent) / 100),
    employer: round2((pensionable * rule.employerPercent) / 100),
  };
}

function computeProgressiveTax(taxable: number, brackets: EngineTaxLine[]): number {
  if (!Number.isFinite(taxable) || taxable <= 0 || !brackets?.length) return 0;
  const sorted = [...brackets].sort((a, b) => a.min - b.min);
  let tax = 0;
  for (const bracket of sorted) {
    const upper = bracket.max === null || bracket.max === undefined ? Infinity : bracket.max;
    const portion = Math.min(taxable, upper) - bracket.min;
    if (portion > 0) tax += (portion * bracket.rate) / 100;
    if (taxable <= upper) break;
  }
  return tax;
}
