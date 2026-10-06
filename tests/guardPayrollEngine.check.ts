/**
 * GUARD PAYROLL ENGINE CHECK — realistic multi-site example.
 *
 * Run: npm run check:guard-payroll   (no DB needed — the engine is pure)
 *
 * Worked example (fictional values, approved business rules):
 *   Site A (PRIMARY)    compensation 12,000 → OT 50.00, Sunday structural 1,600,
 *                       remaining 10,400, transport 20% = 2,080, basic 8,320,
 *                       basic hourly = 8,320 / 208 = 40.00
 *   Site B (ADDITIONAL) compensation 9,000 → OT 37.50
 *   Site C (ADDITIONAL) compensation 6,000 → OT 25.00
 *
 *   Site A: 200 normal h × 40 + 8 holiday h × 50 + 24 Sunday h × 50 + transport
 *         = 8,000 + 400 + 1,200 + 2,080 = 11,680
 *   Site B: 20 h × 37.50 = 750      Site C: 12 h × 25.00 = 300
 *   GROSS = 12,730
 *   Pension 7%/11% on the primary NORMAL-HOUR pay 8,000 ONLY → employee 560,
 *   employer 880 (Sunday OT 1,200 + holiday OT 400 + additional 1,050 excluded)
 *   Taxable = 8,000 + 400 + 1,200 + 750 + 300 = 10,650 (all pay, transport
 *   excluded; employee pension NOT subtracted — same as the staff calculation)
 *   Staff tax schedule on 10,650 = 300 + 600 + 750 + 650×30% = 1,845.00
 *   Deductions: loan installment 500 + penalty 200 = 700
 *   NET = 12,730 − 560 − 1,845 − 700 = 9,625.00
 */
import { computeGuardPayroll, PayrollConfigNumbers } from '../src/modules/guardPayroll/guardPayrollEngine';

const CONFIG: PayrollConfigNumbers = {
  transportPercent: 20,
  standardMonthlyHours: 240,
  sundayStructuralHours: 32,
  basicHourlyDivisor: 208,
};

/** Staff income tax schedule — guards now use the SAME schedule as staff (2026-10). */
const STAFF_TAX_BRACKETS = [
  { min: 0, max: 2000, rate: 0 },
  { min: 2000, max: 4000, rate: 15 },
  { min: 4000, max: 7000, rate: 20 },
  { min: 7000, max: 10000, rate: 25 },
  { min: 10000, max: 14000, rate: 30 },
  { min: 14000, max: null, rate: 35 },
];

let failures = 0;

function check(name: string, actual: number | string | boolean, expected: number | string | boolean) {
  const ok =
    typeof expected === 'number'
      ? typeof actual === 'number' && Math.abs(actual - expected) < 0.005
      : actual === expected;
  if (ok) {
    console.log(`  PASS  ${name} = ${actual}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}: expected ${expected}, got ${actual}`);
  }
}

function section(title: string) {
  console.log(`\n== ${title} ==`);
}

// ─────────────────────────────────────────────────────────────────────
section('Primary site decomposition (compensation 12,000)');
const primary = computeGuardPayroll({
  primary: { siteId: 'siteA', compensationAmount: 12000, hours: { normalHours: 200, holidayHours: 8, sundayHours: 24 } },
  additionalSites: [],
  config: CONFIG,
  pensionEnrolled: false,
  pension: null,
  taxBrackets: [],
  deductions: [],
}).primary;
check('OT Rate (12000/240)', primary.otRate, 50);
check('Sunday structural (50×32)', primary.sundayStructuralAllocation, 1600);
check('Remaining (12000−1600)', primary.remaining, 10400);
check('Transport (10400×20%)', primary.transportFull, 2080);
check('Basic salary (10400−2080)', primary.basicSalary, 8320);
check('Basic hourly rate (8320/208 — NOT 240)', primary.basicHourlyRate, 40);
check('Normal pay (200×40)', primary.normalPay, 8000);
check('Holiday pay (8×50)', primary.holidayPay, 400);
check('Sunday pay (24×50)', primary.sundayPay, 1200);
check('Site A earnings (incl. transport)', primary.siteEarnings, 11680);

// ─────────────────────────────────────────────────────────────────────
section('Multi-site guard X (primary A + additional B & C)');
const guardX = computeGuardPayroll({
  primary: { siteId: 'siteA', compensationAmount: 12000, hours: { normalHours: 200, holidayHours: 8, sundayHours: 24 } },
  additionalSites: [
    { siteId: 'siteB', compensationAmount: 9000, hours: { normalHours: 20, holidayHours: 0, sundayHours: 0 } },
    { siteId: 'siteC', compensationAmount: 6000, hours: { normalHours: 12, holidayHours: 0, sundayHours: 0 } },
  ],
  config: CONFIG,
  pensionEnrolled: true,
  pension: { employeePercent: 7, employerPercent: 11 },
  taxBrackets: STAFF_TAX_BRACKETS,
  deductions: [
    { deductionId: 'd1', type: 'LOAN', label: 'Loan installment', amount: 500 },
    { deductionId: 'd2', type: 'PENALTY', label: 'Uniform penalty', amount: 200 },
  ],
});
check('Site B OT uses Site B compensation (9000/240)', guardX.additionalSites[0].otRate, 37.5);
check('Site C OT uses Site C compensation (6000/240)', guardX.additionalSites[1].otRate, 25);
check('Site B earnings (20×37.50)', guardX.additionalSites[0].siteEarnings, 750);
check('Site C earnings (12×25.00)', guardX.additionalSites[1].siteEarnings, 300);
check('Gross (11680+750+300)', guardX.grossEarnings, 12730);
check('Pension base = primary NORMAL-HOUR pay ONLY (8,000, no Sunday/holiday OT)', guardX.pensionBase, 8000);
check('Employee pension (7% of 8000)', guardX.employeePension, 560);
check('Employer pension (11% of 8000)', guardX.employerPension, 880);
check('Taxable (8000+400+1200+750+300, transport excluded, no pension relief)', guardX.taxableEarnings, 10650);
check('Income tax (STAFF schedule on 10650)', guardX.incomeTax, 1845);
check('Total deductions (500+200)', guardX.totalDeductions, 700);
check('NET PAY', guardX.netPay, 9625);

// ─────────────────────────────────────────────────────────────────────
section('Attendance-driven: zero hours earn zero (no auto full-month pay)');
const idle = computeGuardPayroll({
  primary: { siteId: 'siteA', compensationAmount: 12000, hours: { normalHours: 0, holidayHours: 0, sundayHours: 0 } },
  additionalSites: [{ siteId: 'siteB', compensationAmount: 9000, hours: { normalHours: 0, holidayHours: 0, sundayHours: 0 } }],
  config: CONFIG,
  pensionEnrolled: true,
  pension: { employeePercent: 7, employerPercent: 11 },
  taxBrackets: STAFF_TAX_BRACKETS,
  deductions: [],
});
check('Gross = 0 (no proration, no automatic transport)', idle.grossEarnings, 0);
check('Pension base = 0', idle.pensionBase, 0);
check('Taxable = 0', idle.taxableEarnings, 0);
check('Net = 0', idle.netPay, 0);

// ─────────────────────────────────────────────────────────────────────
section('Mid-month join: fewer hours → proportionally less, same formula');
const joinedLate = computeGuardPayroll({
  primary: { siteId: 'siteA', compensationAmount: 12000, hours: { normalHours: 60, holidayHours: 0, sundayHours: 8 } },
  additionalSites: [],
  config: CONFIG,
  pensionEnrolled: true,
  pension: { employeePercent: 7, employerPercent: 11 },
  taxBrackets: STAFF_TAX_BRACKETS,
  deductions: [],
});
check('Normal pay (60×40)', joinedLate.primary.normalPay, 2400);
check('Sunday pay (8×50)', joinedLate.primary.sundayPay, 400);
check('Transport paid (worked this month)', joinedLate.primary.transportPaid, 2080);
check('Pension base = normal-hour pay only (2400, Sunday OT excluded)', joinedLate.pensionBase, 2400);
check('Employee pension (7% of 2400)', joinedLate.employeePension, 168);
check('Taxable (2400+400, no pension relief)', joinedLate.taxableEarnings, 2800);
check('Income tax (staff schedule on 2800 = 15% of 800)', joinedLate.incomeTax, 120);
check('Net (4880 − 168 − 120)', joinedLate.netPay, 4592);

// ─────────────────────────────────────────────────────────────────────
section('Not pension-enrolled: no pension, taxable keeps full salary base');
const noPension = computeGuardPayroll({
  primary: { siteId: 'siteA', compensationAmount: 12000, hours: { normalHours: 200, holidayHours: 8, sundayHours: 24 } },
  additionalSites: [],
  config: CONFIG,
  pensionEnrolled: false,
  pension: { employeePercent: 7, employerPercent: 11 },
  taxBrackets: STAFF_TAX_BRACKETS,
  deductions: [],
});
check('Pension base = 0', noPension.pensionBase, 0);
check('Employee pension = 0', noPension.employeePension, 0);
check('Taxable (8000+400+1200, full base kept)', noPension.taxableEarnings, 9600);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
