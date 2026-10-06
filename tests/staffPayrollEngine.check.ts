/**
 * STAFF PAYROLL ENGINE CHECK — frozen company spreadsheet formula.
 *
 * Run: npm run check:staff-payroll   (no DB needed — the engine is pure)
 *
 * STAFF TAX SCHEDULE (relief-style, mathematically identical to the marginal
 * brackets [0–2000:0%, 2000–4000:15%, 4000–7000:20%, 7000–10000:25%,
 * 10000–14000:30%, >14000:35%] — verified at every boundary and midpoint):
 *
 *   ≤ 2,000 → 0%          ≤ 7,000 → 20% − 500      > 14,000 → 35% − 2,050
 *   ≤ 4,000 → 15% − 300   ≤ 10,000 → 25% − 850
 *   ≤ 14,000 → 30% − 1,350
 */
import {
  computeStaffPayroll,
  round2,
  StaffEngineInput,
} from '../src/modules/staffPayroll/staffPayrollEngine';

let passed = 0;
let failed = 0;
function check(name: string, actual: number | boolean, expected: number | boolean) {
  const ok = typeof expected === 'number' ? Math.abs((actual as number) - expected) < 0.011 : actual === expected;
  if (ok) { passed++; console.log(`  PASS  ${name} = ${actual}`); }
  else { failed++; console.log(`  FAIL  ${name}: expected ${expected}, got ${actual}`); }
}

const STAFF_TAX_BRACKETS = [
  { min: 0, max: 2000, rate: 0 },
  { min: 2000, max: 4000, rate: 15 },
  { min: 4000, max: 7000, rate: 20 },
  { min: 7000, max: 10000, rate: 25 },
  { min: 10000, max: 14000, rate: 30 },
  { min: 14000, max: null, rate: 35 },
];

const PENSION = { employeePercent: 7, employerPercent: 11, minPensionableSalary: null, maxPensionableSalary: null };

function baseInput(over: Partial<StaffEngineInput> = {}): StaffEngineInput {
  return {
    contract: {
      contractId: 'c1',
      basic: 6000,
      responsibilityAllowance: 800,
      teleAllowance: 300,
      taxableTransport: 500,
      nonTaxableTransport: 700,
      pensionEnrolled: true,
    },
    overtimeAmount: 0,
    bonusAmount: 0,
    deductions: [],
    taxBrackets: STAFF_TAX_BRACKETS,
    pension: PENSION,
    ...over,
  };
}

// ─────────────────────────────────────────────────────────────────────
console.log('== Staff tax schedule (taxable → tax) ==');
function taxOf(taxable: number) {
  return computeStaffPayroll(baseInput({
    contract: {
      contractId: 'c1', basic: taxable, responsibilityAllowance: 0, teleAllowance: 0,
      taxableTransport: 0, nonTaxableTransport: 0, pensionEnrolled: false,
    },
    pension: null,
  })).incomeTax;
}
check('tax(1,500) = 0', taxOf(1500), 0);
check('tax(2,000) = 0', taxOf(2000), 0);
check('tax(2,001) = 0.15', taxOf(2001), 0.15);
check('tax(3,000) = 150  (15%−300)', taxOf(3000), 150);
check('tax(4,000) = 300  (15%−300)', taxOf(4000), 300);
check('tax(4,001) = 300.20', taxOf(4001), 300.2);
check('tax(7,000) = 900  (20%−500)', taxOf(7000), 900);
check('tax(7,001) = 900.25', taxOf(7001), 900.25);
check('tax(10,000) = 1,650  (25%−850)', taxOf(10000), 1650);
check('tax(10,001) = 1,650.30', taxOf(10001), 1650.3);
check('tax(14,000) = 2,850  (30%−1,350)', taxOf(14000), 2850);
check('tax(14,001) = 2,850.35', taxOf(14001), 2850.35);
check('tax(20,000) = 4,950  (35%−2,050)', taxOf(20000), 4950);

// ─────────────────────────────────────────────────────────────────────
console.log('== Worked example: full formula ==');
// Basic 6,000 + Resp 800 + Tele 300 + TaxTrans 500 + NonTaxTrans 700 + OT 900
const ex = computeStaffPayroll(baseInput({
  overtimeAmount: 900,
  bonusAmount: 1500,
  deductions: [
    { deductionId: 'd1', type: 'LOAN', label: 'Loan installment', amount: 400 },
    { deductionId: 'd2', type: 'PENALTY', label: 'Late penalty', amount: 100 },
  ],
}));
check('Gross = 6000+800+300+500+700+900', ex.grossEarnings, 9200);
check('Taxable excludes non-tax transport', ex.taxableEarnings, 8500);
check('Employee pension = Basic×7%', ex.employeePension, 420);
check('Employer pension = Basic×11% (kept separate)', ex.employerPension, 660);
check('Tax on 8,500 taxable = 1,275 (no pension relief per frozen spec)', ex.incomeTax, 1275);
check('Total deduction = 1,275 tax + 420 pension + 400 + 100', ex.totalDeductions, 2195);
check('Net = 9,200 − 2,195', ex.netPay, 7005);
check('Bonus NOT in gross/deductions, added after', ex.finalAmountPaid, 8505);
check('Gross excludes bonus', ex.grossEarnings === 9200 && ex.grossEarnings !== ex.grossEarnings + 1500, true);

// ─────────────────────────────────────────────────────────────────────
console.log('== Pension opt-out (pensionEnrolled = false) ==');
const optOut = computeStaffPayroll(baseInput({ contract: { ...baseInput().contract, pensionEnrolled: false } }));
check('Employee pension = 0', optOut.employeePension, 0);
check('Employer pension = 0', optOut.employerPension, 0);
check('Taxable has no pension relief', optOut.taxableEarnings, 7600);
check('Tax on 7,600 taxable = 1,050 (25% band)', optOut.incomeTax, 1050);
check('Net = gross − tax only', optOut.netPay, round2(8300 - 1050));

// ─────────────────────────────────────────────────────────────────────
console.log('== Non-taxable transport never taxed ==');
const withNonTax = computeStaffPayroll(baseInput({
  contract: {
    contractId: 'c1', basic: 6000, responsibilityAllowance: 0, teleAllowance: 0,
    taxableTransport: 0, nonTaxableTransport: 2000, pensionEnrolled: false,
  },
  pension: null,
}));
check('Gross includes non-tax transport (8,000)', withNonTax.grossEarnings, 8000);
check('Taxable excludes it (6,000)', withNonTax.taxableEarnings, 6000);
check('Tax = 700 (20% band)', withNonTax.incomeTax, 700);
check('Net = 8,000 − 700', withNonTax.netPay, 7300);

// ─────────────────────────────────────────────────────────────────────
console.log('== Bonus fully isolated ==');
const noBonus = computeStaffPayroll(baseInput());
const withBonus = computeStaffPayroll(baseInput({ bonusAmount: 5000 }));
check('Gross unchanged by bonus', withBonus.grossEarnings, noBonus.grossEarnings);
check('Taxable unchanged by bonus', withBonus.taxableEarnings, noBonus.taxableEarnings);
check('Tax unchanged by bonus', withBonus.incomeTax, noBonus.incomeTax);
check('Pension unchanged by bonus', withBonus.employeePension, noBonus.employeePension);
check('Deductions unchanged by bonus', withBonus.totalDeductions, noBonus.totalDeductions);
check('Net unchanged by bonus', withBonus.netPay, noBonus.netPay);
check('Final = Net + 5,000', withBonus.finalAmountPaid, round2(noBonus.netPay + 5000));

// ─────────────────────────────────────────────────────────────────────
console.log('== Zero / edge cases ==');
const zero = computeStaffPayroll(baseInput({
  contract: {
    contractId: 'c1', basic: 0, responsibilityAllowance: 0, teleAllowance: 0,
    taxableTransport: 0, nonTaxableTransport: 0, pensionEnrolled: true,
  },
  overtimeAmount: 0, bonusAmount: 0,
}));
check('All-zero contract → gross 0', zero.grossEarnings, 0);
check('All-zero → pension 0', zero.employeePension, 0);
check('All-zero → net 0', zero.netPay, 0);
const negativeNet = computeStaffPayroll(baseInput({
  contract: {
    contractId: 'c1', basic: 100, responsibilityAllowance: 0, teleAllowance: 0,
    taxableTransport: 0, nonTaxableTransport: 0, pensionEnrolled: false,
  },
  pension: null,
  deductions: [{ deductionId: 'd9', type: 'PENALTY', label: 'Big penalty', amount: 500 }],
}));
check('Deductions > gross → negative net allowed + warned', negativeNet.netPay, -400);
check('Warning present', negativeNet.warnings.length > 0, true);

console.log(failed === 0 ? `\nALL CHECKS PASSED (${passed}/${passed + failed})` : `\n${failed} CHECK(S) FAILED (${passed} passed)`);
process.exit(failed === 0 ? 0 : 1);
