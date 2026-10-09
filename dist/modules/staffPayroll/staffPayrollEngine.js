"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round2 = void 0;
exports.computeStaffPayroll = computeStaffPayroll;
const statutory_service_1 = require("../payrollCommon/statutory.service");
const round2 = (n) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
exports.round2 = round2;
function computeStaffPayroll(input) {
    const c = input.contract;
    const overtimeAmount = (0, exports.round2)(input.overtimeAmount || 0);
    const bonusAmount = (0, exports.round2)(input.bonusAmount || 0);
    const basic = (0, exports.round2)(c.basic);
    const responsibility = (0, exports.round2)(c.responsibilityAllowance);
    const tele = (0, exports.round2)(c.teleAllowance);
    const taxableTransport = (0, exports.round2)(c.taxableTransport);
    const nonTaxableTransport = (0, exports.round2)(c.nonTaxableTransport);
    // 1. Gross (non-taxable transport IS part of gross).
    const grossEarnings = (0, exports.round2)(basic + responsibility + tele + nonTaxableTransport + taxableTransport + overtimeAmount);
    // 2. Taxable — non-taxable transport excluded (rule 2).
    const taxableEarnings = (0, exports.round2)(basic + responsibility + tele + taxableTransport + overtimeAmount);
    // 3. Pension on Basic ONLY, honouring the contract opt-out.
    let employeePension = 0;
    let employerPension = 0;
    const warnings = [];
    if (c.pensionEnrolled && input.pension) {
        const p = statutory_service_1.StatutoryService.computePension(basic, input.pension);
        employeePension = p.employee;
        employerPension = p.employer;
    }
    else if (c.pensionEnrolled && !input.pension) {
        warnings.push('No pension rule is configured for this period — pension was not applied.');
    }
    // 4. Income tax on Taxable Earnings (the staff schedule).
    const incomeTax = (0, exports.round2)(statutory_service_1.StatutoryService.computeProgressiveTax(taxableEarnings, input.taxBrackets));
    if (!input.taxBrackets?.length) {
        warnings.push('No income tax table is configured for this period — income tax was not applied.');
    }
    // 5. Total deduction = income tax + employee pension + penalty/loan/other.
    const deductions = (input.deductions || []).map((d) => ({ ...d, amount: (0, exports.round2)(d.amount) }));
    const totalDeductions = (0, exports.round2)(incomeTax + employeePension + deductions.reduce((s, d) => s + d.amount, 0));
    // 6. Net pay.
    const netPay = (0, exports.round2)(grossEarnings - totalDeductions);
    if (netPay < 0) {
        warnings.push('Net pay is negative — total deductions exceed gross earnings.');
    }
    // 7. Bonus is added AFTER net pay and never enters the formula above.
    const finalAmountPaid = (0, exports.round2)(netPay + bonusAmount);
    return {
        overtimeAmount,
        bonusAmount,
        grossEarnings,
        taxableEarnings,
        employeePension,
        employerPension,
        incomeTax,
        deductions,
        totalDeductions,
        netPay,
        bonus: bonusAmount,
        finalAmountPaid,
        warnings,
    };
}
//# sourceMappingURL=staffPayrollEngine.js.map