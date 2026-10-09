"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.round4 = exports.round2 = void 0;
exports.computePrimarySite = computePrimarySite;
exports.computeAdditionalSite = computeAdditionalSite;
exports.computeGuardPayroll = computeGuardPayroll;
const round2 = (n) => Math.round(n * 100) / 100;
exports.round2 = round2;
const round4 = (n) => Math.round(n * 10000) / 10000;
exports.round4 = round4;
/** One primary site's compensation decomposition — rates derive ONLY from the compensation amount. */
function computePrimarySite(input, config) {
    const { compensationAmount } = input;
    const hours = {
        normalHours: input.hours.normalHours || 0,
        holidayHours: input.hours.holidayHours || 0,
        sundayHours: input.hours.sundayHours || 0,
    };
    const otRate = (0, exports.round4)(compensationAmount / config.standardMonthlyHours);
    const sundayStructuralAllocation = (0, exports.round2)(otRate * config.sundayStructuralHours);
    const remaining = (0, exports.round2)(compensationAmount - sundayStructuralAllocation);
    const transportFull = (0, exports.round2)((remaining * config.transportPercent) / 100);
    const basicSalary = (0, exports.round2)(remaining - transportFull);
    const basicHourlyRate = (0, exports.round4)(basicSalary / config.basicHourlyDivisor);
    const normalPay = (0, exports.round2)(hours.normalHours * basicHourlyRate);
    const holidayPay = (0, exports.round2)(hours.holidayHours * otRate);
    const sundayPay = (0, exports.round2)(hours.sundayHours * otRate);
    const primaryTaxable = (0, exports.round2)(normalPay + holidayPay + sundayPay);
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
        siteEarnings: (0, exports.round2)(primaryTaxable + transportPaid),
    };
}
/** One additional site — hours × THAT site's OT rate. No basic, no transport. */
function computeAdditionalSite(input, config) {
    const hours = {
        normalHours: input.hours.normalHours || 0,
        holidayHours: input.hours.holidayHours || 0,
        sundayHours: input.hours.sundayHours || 0,
    };
    const otRate = (0, exports.round4)(input.compensationAmount / config.standardMonthlyHours);
    const totalHours = (0, exports.round2)(hours.normalHours + hours.holidayHours + hours.sundayHours);
    return {
        siteId: input.siteId,
        compensationAmount: input.compensationAmount,
        otRate,
        ...hours,
        totalHours,
        siteEarnings: (0, exports.round2)(totalHours * otRate),
    };
}
function computeGuardPayroll(input) {
    const primary = computePrimarySite(input.primary, input.config);
    const additionalSites = (input.additionalSites || []).map((site) => computeAdditionalSite(site, input.config));
    const additionalTotal = (0, exports.round2)(additionalSites.reduce((sum, s) => sum + s.siteEarnings, 0));
    const grossEarnings = (0, exports.round2)(primary.siteEarnings + additionalTotal);
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
    const taxableEarnings = (0, exports.round2)(primary.normalPay + primary.holidayPay + primary.sundayPay + additionalTotal);
    const incomeTax = (0, exports.round2)(computeProgressiveTax(taxableEarnings, input.taxBrackets));
    const deductions = (input.deductions || []).map((d) => ({ ...d, amount: (0, exports.round2)(d.amount) }));
    const totalDeductions = (0, exports.round2)(deductions.reduce((sum, d) => sum + d.amount, 0));
    const netPay = (0, exports.round2)(grossEarnings - employeePension - incomeTax - totalDeductions);
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
function roundPension(base, rule) {
    let pensionable = base;
    if (rule.minPensionableSalary !== null && rule.minPensionableSalary !== undefined) {
        pensionable = Math.max(pensionable, rule.minPensionableSalary);
    }
    if (rule.maxPensionableSalary !== null && rule.maxPensionableSalary !== undefined) {
        pensionable = Math.min(pensionable, rule.maxPensionableSalary);
    }
    return {
        employee: (0, exports.round2)((pensionable * rule.employeePercent) / 100),
        employer: (0, exports.round2)((pensionable * rule.employerPercent) / 100),
    };
}
function computeProgressiveTax(taxable, brackets) {
    if (!Number.isFinite(taxable) || taxable <= 0 || !brackets?.length)
        return 0;
    const sorted = [...brackets].sort((a, b) => a.min - b.min);
    let tax = 0;
    for (const bracket of sorted) {
        const upper = bracket.max === null || bracket.max === undefined ? Infinity : bracket.max;
        const portion = Math.min(taxable, upper) - bracket.min;
        if (portion > 0)
            tax += (portion * bracket.rate) / 100;
        if (taxable <= upper)
            break;
    }
    return tax;
}
//# sourceMappingURL=guardPayrollEngine.js.map