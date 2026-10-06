import { StatutoryService } from '../payrollCommon/statutory.service';

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
  basic: number; // Contract.wage
  responsibilityAllowance: number;
  teleAllowance: number;
  taxableTransport: number;
  nonTaxableTransport: number; // Contract.nonTaxableAllowance
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
  taxBrackets: { min: number; max: number | null; rate: number }[];
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

export const round2 = (n: number) => Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;

export function computeStaffPayroll(input: StaffEngineInput): StaffPayrollCalculation {
  const c = input.contract;
  const overtimeAmount = round2(input.overtimeAmount || 0);
  const bonusAmount = round2(input.bonusAmount || 0);

  const basic = round2(c.basic);
  const responsibility = round2(c.responsibilityAllowance);
  const tele = round2(c.teleAllowance);
  const taxableTransport = round2(c.taxableTransport);
  const nonTaxableTransport = round2(c.nonTaxableTransport);

  // 1. Gross (non-taxable transport IS part of gross).
  const grossEarnings = round2(
    basic + responsibility + tele + nonTaxableTransport + taxableTransport + overtimeAmount
  );

  // 2. Taxable — non-taxable transport excluded (rule 2).
  const taxableEarnings = round2(basic + responsibility + tele + taxableTransport + overtimeAmount);

  // 3. Pension on Basic ONLY, honouring the contract opt-out.
  let employeePension = 0;
  let employerPension = 0;
  const warnings: string[] = [];
  if (c.pensionEnrolled && input.pension) {
    const p = StatutoryService.computePension(basic, input.pension as any);
    employeePension = p.employee;
    employerPension = p.employer;
  } else if (c.pensionEnrolled && !input.pension) {
    warnings.push('No pension rule is configured for this period — pension was not applied.');
  }

  // 4. Income tax on Taxable Earnings (the staff schedule).
  const incomeTax = round2(StatutoryService.computeProgressiveTax(taxableEarnings, input.taxBrackets as any));
  if (!input.taxBrackets?.length) {
    warnings.push('No income tax table is configured for this period — income tax was not applied.');
  }

  // 5. Total deduction = income tax + employee pension + penalty/loan/other.
  const deductions = (input.deductions || []).map((d) => ({ ...d, amount: round2(d.amount) }));
  const totalDeductions = round2(
    incomeTax + employeePension + deductions.reduce((s, d) => s + d.amount, 0)
  );

  // 6. Net pay.
  const netPay = round2(grossEarnings - totalDeductions);
  if (netPay < 0) {
    warnings.push('Net pay is negative — total deductions exceed gross earnings.');
  }

  // 7. Bonus is added AFTER net pay and never enters the formula above.
  const finalAmountPaid = round2(netPay + bonusAmount);

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
