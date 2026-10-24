/**
 * REPORT ISOLATION CHECK (final-release verification, DEF-H3/DEF-M2 follow-up)
 *
 * Runs the COMPLETE role/report matrix through the REAL HTTP API against an
 * isolated ephemeral MongoDB database (never the configured employee
 * database), with REAL payroll amounts in the database:
 *
 *   - every /module-reports route x every role must match the REPORT_ROLES
 *     scope matrix (route guard AND service guard),
 *   - forbidden roles must get 403 with NO data and NO amounts, whatever the
 *     query string (format=csv, huge limits, module=STAFF/GUARD, searches),
 *   - allowed payloads must not leak credentials (no `password` field),
 *   - legacy /reports/* endpoints stay retired (they expose no amounts),
 *   - payroll export endpoints follow the payroll domain (GUARD block on the
 *     shared router; guard self-service sees only own records),
 *   - the live staff payroll records consumed by the matrix are generated
 *     through the real FINANCE payroll API (not hand-seeded snapshots).
 */
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app';
import { Employee } from '../src/models/Employee';
import { User } from '../src/models/User';
import { Contract } from '../src/models/Contract';
import { TaxBracket } from '../src/models/TaxBracket';
import { PensionRule } from '../src/models/PensionRule';
import { GuardPayrollRun } from '../src/models/GuardPayrollRun';
import { GuardPayrollRecord } from '../src/models/GuardPayrollRecord';
import { registerCorePermissions } from '../src/core/permissions/core.permissions';
import { registerHRPermissions } from '../src/modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from '../src/modules/hr/permissions/payroll.permissions';
import { REPORT_ROLES } from '../src/modules/reports2/reportScopes';
import { UserRole, PERMISSIONS } from '../src/types';
import { computeEffectivePermissions } from '../src/middleware/rbac';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`OK: ${msg}`); }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

const ROLE_KEYS: [string, string, string][] = [
  ['ADMIN', 'repi-admin@vital-test.invalid', 'SUPER_ADMIN'],
  ['SYSADMIN', 'repi-sysadmin@vital-test.invalid', 'SYSTEM_ADMIN'],
  ['HR', 'repi-hr@vital-test.invalid', 'HR_ADMIN'],
  ['FINANCE', 'repi-finance@vital-test.invalid', 'FINANCE_OFFICER'],
  ['OPS', 'repi-ops@vital-test.invalid', 'OPERATIONS'],
  ['HEAD', 'repi-head@vital-test.invalid', 'HEAD'],
  ['CEO', 'repi-ceo@vital-test.invalid', 'CEO'],
  ['GUARD', 'repi-guard@vital-test.invalid', 'GUARD'],
];

const ROLE_ENUM: Record<string, UserRole> = {
  ADMIN: UserRole.SUPER_ADMIN,
  SYSADMIN: UserRole.SYSTEM_ADMIN,
  HR: UserRole.HR_ADMIN,
  FINANCE: UserRole.FINANCE_OFFICER,
  OPS: UserRole.OPERATIONS,
  HEAD: UserRole.HEAD,
  CEO: UserRole.CEO,
  GUARD: UserRole.GUARD,
};

async function main() {
  const database = `repi_check_${Date.now()}`;
  await mongoose.connect(`mongodb://127.0.0.1:27029/${database}?replicaSet=guardE2e`, { serverSelectionTimeoutMS: 5000 });
  registerCorePermissions(); registerHRPermissions(); registerPayrollPermissions();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  // ── accounts ─────────────────────────────────────────────────────────
  const pwd = await bcrypt.hash('Report-Isolation-2026!', 10);
  // Guard employees used for the self-service isolation checks (guard A is
  // linked to the GUARD login, guard B must stay invisible to it).
  const guardA = await Employee.create({
    employeeCode: `REPIGA${String(Date.now() % 1000000)}`, firstName: 'Repi', lastName: 'GuardA',
    category: 'GUARD', status: 'CONTRACTED',
  });
  const guardB = await Employee.create({
    employeeCode: `REPIGB${String(Date.now() % 1000000)}`, firstName: 'Repi', lastName: 'GuardB',
    category: 'GUARD', status: 'CONTRACTED',
  });
  for (const [, email, role] of ROLE_KEYS) {
    await User.create({ email, password: pwd, firstName: role, lastName: 'Repi', role,
      ...(role === 'GUARD' ? { employeeId: guardA._id } : {}) });
  }

  // ── server ───────────────────────────────────────────────────────────
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;

  const tokens: Record<string, string> = {};
  for (const [role, email] of ROLE_KEYS) {
    const res = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Report-Isolation-2026!' }),
      signal: AbortSignal.timeout(15000),
    });
    assert.equal(res.status, 200, `login ${role}`);
    tokens[role] = ((await res.json()) as any).data.token;
  }
  async function request(role: string, method: string, route: string, body?: unknown): Promise<{ status: number; text: string; json: any }> {
    const res = await fetch(`${origin}/api${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[role]}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* non-JSON (CSV etc.) */ }
    return { status: res.status, text, json };
  }

  // ── seed REAL staff payroll data through the REAL API ────────────────
  const staff = await Employee.create({
    employeeCode: `REPI${String(Date.now() % 1000000)}`, firstName: 'Repi', lastName: 'Staff',
    category: 'OFFICE_STAFF', status: 'CONTRACTED',
  });
  const staffContract = await Contract.create({
    employeeId: staff._id, contractType: 'Full-Time', contractStartDate: '2026-10-01',
    wage: 9500, responsibilityAllowance: 250, teleAllowance: 100, taxableTransport: 150,
    nonTaxableAllowance: 200, transportAllowance: 0, pensionEnrolled: true,
  } as any);
  ok(!!staffContract, 'staff contract seeded');

  await TaxBracket.create({
    name: 'Repi staff tax', kind: 'STAFF', effectiveFrom: new Date('2026-01-01'),
    brackets: [
      { min: 0, max: 2000, rate: 0 },
      { min: 2000, max: 4000, rate: 15 },
      { min: 4000, max: 7000, rate: 20 },
      { min: 7000, max: 10000, rate: 25 },
      { min: 10000, max: 14000, rate: 30 },
      { min: 14000, max: null, rate: 35 },
    ],
  } as any);
  await PensionRule.create({ name: 'Repi staff pension', kind: 'STAFF', effectiveFrom: new Date('2026-01-01'), effectiveUntil: null, employeePercent: 7, employerPercent: 11 });

  // Independent derivation for the seeded contract: gross 10,200, taxable 10,000.
  const contractAmounts = {
    grossEarnings: 9500 + 250 + 100 + 150 + 200,
    taxableEarnings: 9500 + 250 + 100 + 150,
  };
  const expectedTax = (2000 * 0) + (2000 * 15) / 100 + (3000 * 20) / 100 + (3000 * 25) / 100;
  const expectedEmpPension = 9500 * 0.07;
  const expectedNet = contractAmounts.taxableEarnings - expectedTax - expectedEmpPension + 200;

  let r = await request('FINANCE', 'POST', '/staff-payroll/generate/2026-10');
  ok(r.status === 201, `staff payroll run generated with real amounts (got ${r.status})`);
  const runData = (r.json as any)?.data;
  assert.ok(runData, 'staff payroll run returned');
  const runId = runData?.run?._id || runData?._id;
  const seeded = (runData.records || []).find((x: any) => String(x.employeeId) === String(staff._id));
  ok(!!seeded && Math.abs(seeded.netPay - expectedNet) < 0.01,
    `seeded staff record netPay=${seeded?.netPay} matches independent derivation ${expectedNet}`);

  // Also create an INDEPENDENTAL spot-check run for another period used below.
  r = await request('FINANCE', 'POST', '/staff-payroll/runs', { periodKey: '2026-11' });
  ok(r.status === 201, `second period generated for query variation checks (got ${r.status})`);

  // ════════════════════════════════════════════════════════════════════
  // A. FULL ROLE x REPORT MATRIX — expected statuses derived from the
  //    committed scope matrix: REPORT_READ is the door, REPORT_ROLES the
  //    scope, audit/users additionally require their dedicated permission.
  // ════════════════════════════════════════════════════════════════════
  const REPORT_PERMISSION: Record<string, (typeof PERMISSIONS) | undefined> = {
    audit: undefined, users: undefined,
  };
  const routes: { key: string; route: string }[] = [
    { key: 'hr', route: '/module-reports/hr' },
    { key: 'sites', route: '/module-reports/sites' },
    { key: 'guards', route: '/module-reports/guards' },
    { key: 'guard-attendance', route: '/module-reports/guard-attendance' },
    { key: 'staff-attendance', route: '/module-reports/staff-attendance' },
    { key: 'payroll', route: '/module-reports/payroll?module=STAFF' },
    { key: 'audit', route: '/module-reports/audit' },
    { key: 'users', route: '/module-reports/users' },
  ];

  for (const { key, route } of routes) {
    for (const [rk] of ROLE_KEYS) {
      const roleEnum = ROLE_ENUM[rk];
      const reportRead = computeEffectivePermissions({ role: roleEnum }).includes(PERMISSIONS.REPORT_READ);
      const extraPermission =
        key === 'audit' ? PERMISSIONS.AUDIT_READ :
        key === 'users' ? PERMISSIONS.USER_READ : undefined;
      const allowed =
        reportRead && (REPORT_ROLES[key] as UserRole[]).includes(roleEnum) &&
        (!extraPermission || computeEffectivePermissions({ role: roleEnum }).includes(extraPermission));
      const expect = allowed ? 200 : 403;

      r = await request(rk, 'GET', route);
      ok(r.status === expect, `${key} report x ${rk} → ${expect} (got ${r.status})`);
      if (expect === 403) {
        ok(!r.json?.data, `${key} report x ${rk}: 403 body carries NO data payload`);
        ok(!/\d{3,}/.test(r.text.replace(/\D/g, '|') || ''), `${key} report x ${rk}: denial text leaks no amounts`);
      }
      if (expect === 200) {
        ok(r.json?.data && Array.isArray(r.json.data.rows), `${key} report x ${rk}: payload shape ok`);
        ok(!JSON.stringify(r.text).toLowerCase().includes('"password"'), `${key} report x ${rk}: no password field anywhere`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // B. QUERY-VARIATION BYPASS ATTEMPTS — forbidden roles must stay denied
  // ════════════════════════════════════════════════════════════════════
  for (const [rk] of ['HR', 'OPS', 'GUARD'].map((k) => [k])) {
    r = await request(rk, 'GET', '/module-reports/payroll?module=STAFF&format=csv');
    ok(r.status === 403, `${rk}: payroll+csv query variation denied (got ${r.status})`);
    r = await request(rk, 'GET', '/module-reports/payroll?module=GUARD&limit=999999&page=2');
    ok(r.status === 403, `${rk}: payroll+limit query variation denied (got ${r.status})`);
    r = await request(rk, 'GET', `/module-reports/payroll?module=STAFF&search=${encodeURIComponent('REPI')}`);
    ok(r.status === 403, `${rk}: payroll+search query variation denied (got ${r.status})`);
    r = await request(rk, 'GET', '/module-reports/payroll?module=BANANA');
    ok(r.status === 403, `${rk}: unknown module value denied (got ${r.status})`);
    r = await request(rk, 'GET', '/module-reports/audit?limit=99999');
    ok(r.status === 403, `${rk}: audit query variation denied (got ${r.status})`);
  }
  // Module switch for ALLOWED roles still works (both periods actually exist).
  r = await request('FINANCE', 'GET', '/module-reports/payroll?module=STAFF&periodKey=2026-11');
  ok(r.status === 200 && r.json?.data?.rows?.length === 1, `FINANCE payroll period filter returns only that period (status ${r.status})`);
  if (r.json?.data?.rows?.[0]) {
    ok(typeof r.json.data.rows[0].netPay === 'number', 'payroll report row carries netPay for an authorized role');
    ok(!r.json.data.rows[0].hasOwnProperty('password'), 'no credential field on payroll rows');
  }

  // ════════════════════════════════════════════════════════════════════
  // C. LEGACY /reports/* — retired endpoints expose nothing (even for
  //    REPORT_READ holders) and never fall through to data.
  // ════════════════════════════════════════════════════════════════════
  for (const legacy of ['/reports/payroll-summary', '/reports/site-labor-cost', '/reports/payment-history']) {
    r = await request('OPS', 'GET', legacy);
    ok(r.status === 400, `legacy ${legacy} retired for REPORT_READ holder OPS (got ${r.status})`);
    ok(!r.json?.data, `legacy ${legacy} carries no data payload`);
  }

  // ════════════════════════════════════════════════════════════════════
  // D. PAYROLL EXPORT + PAYSLIP SURFACE — permission gate + guard block
  // ════════════════════════════════════════════════════════════════════
  // By the committed role map OPS holds OFFICE_PAYROLL_READ + GUARD_PAYROLL_READ
  // (payroll ROW reader), while the payroll module REPORT is scope-limited to
  // FINANCE/HEAD/CEO/admins — different surfaces, both verified here.
  r = await request('OPS', 'GET', `/staff-payroll/runs/${runId}/export/bank`);
  ok(r.status === 200 && /bank|account/i.test(r.text), `OPS staff bank export readable via READ permission (status ${r.status})`);
  r = await request('OPS', 'GET', `/staff-payroll/records/${String(seeded?._id)}/payslip`);
  ok(r.status === 200, `OPS staff payslip readable via READ permission (status ${r.status})`);
  r = await request('OPS', 'GET', '/guard-payroll/runs/000000000000000000000000/export/pension');
  ok(r.status === 404, `OPS guard export on unknown run is NOT permission-denied (precedence check, got ${r.status})`);

  r = await request('FINANCE', 'GET', `/staff-payroll/runs/${runId}/export/bank`);
  ok(r.status === 200 && /bank|account/i.test(r.text), `FINANCE staff bank export returns a CSV (status ${r.status})`);
  r = await request('FINANCE', 'GET', `/staff-payroll/runs/${runId}/export/tax`);
  ok(r.status === 200, `FINANCE staff tax export (status ${r.status})`);
  r = await request('FINANCE', 'GET', `/staff-payroll/records/${String(seeded?._id)}/payslip`);
  ok(r.status === 200, `FINANCE staff payslip (status ${r.status})`);

  // GUARD role hard block: the shared all-employee router is closed for GUARD
  // before any permission check; exports and lists included.
  r = await request('GUARD', 'GET', `/guard-payroll/runs/${runId}/export/bank`);
  ok(r.status === 403, `GUARD-role all-employee guard export → 403 (got ${r.status})`);
  r = await request('GUARD', 'GET', '/guard-payroll');
  ok(r.status === 403, `GUARD all-employee guard payroll list → 403 (got ${r.status})`);

  // ════════════════════════════════════════════════════════════════════
  // E. GUARD SELF-SERVICE ISOLATION — /my returns ONLY the linked guard's
  //    row; another guard's code and amounts must be invisible.
  // ════════════════════════════════════════════════════════════════════
  const guardRun = await GuardPayrollRun.create({ periodKey: '2026-10' } as any);
  const dummySiteId = `0000000000000000000000${String(Date.now() % 100).padStart(2, '0')}` as any;
  const guardSeed = (emp: any, code: string, fullName: string, net: number) => ({
    runId: guardRun._id, periodKey: '2026-10', employeeId: emp._id,
    snapshot: { employeeCode: code, fullName, pensionEnrolled: false },
    primarySite: {
      siteId: dummySiteId, siteName: 'Repi Site', compensationAmount: 5000, transportPercent: 20,
      standardMonthlyHours: 208, sundayStructuralHours: 16, basicHourlyDivisor: 208, otRate: 1.5,
      sundayStructuralAllocation: 8, remaining: 4900, transportFull: 1000,
      basicSalary: 4000, basicHourlyRate: 19.23, normalHours: 0, holidayHours: 0, sundayHours: 0,
      normalPay: 0, holidayPay: 0, sundayPay: 0, transportPaid: 0, siteEarnings: 0,
    },
    additionalSites: [], grossEarnings: 5000, pensionBase: 3984, taxableEarnings: 5000,
    employeePension: 0, employerPension: 0, incomeTax: 0, deductions: [], totalDeductions: 0,
    netPay: net, warnings: ['Repi isolated test fixture'],
  });
  await GuardPayrollRecord.create(guardSeed(guardA, String(guardA.employeeCode), 'Repi GuardA', 3300) as any);
  const guardBNet = 98765.43;
  await GuardPayrollRecord.create(guardSeed(guardB, String(guardB.employeeCode), 'Repi GuardB', guardBNet) as any);

  r = await request('GUARD', 'GET', '/guard-payroll/my');
  ok(r.status === 200, `GUARD /my readable for a linked guard (got ${r.status})`);
  const mine = (r.json?.data || []) as any[];
  ok(mine.length === 1, `GUARD /my returns exactly own rows (got ${mine.length})`);
  ok(mine[0]?.netPay === 3300, `GUARD /my own row netPay present (got ${mine[0]?.netPay})`);
  ok(!JSON.stringify(r.json).includes(String(guardB.employeeCode)), `GUARD /my never exposes guard B's code`);
  ok(!JSON.stringify(r.json).includes(String(guardBNet)), `GUARD /my never exposes guard B's amounts`);
  r = await request('GUARD', 'GET', '/guard-payroll/my?periodKey=2026-10');
  ok(r.status === 200, `GUARD /my period filter works (got ${r.status})`);

  // Guard payroll STATUTORY exports for an authorized reader (FINANCE):
  // bank/tax/pension CSVs + own payslip all parse from the same snapshot.
  const guardRecA = await GuardPayrollRecord.findOne({ employeeId: guardA._id });
  r = await request('FINANCE', 'GET', `/guard-payroll/runs/${guardRun._id}/export/tax`);
  ok(r.status === 200 && r.text.includes(',') && !r.text.startsWith('{'), `FINANCE guard tax export returns a CSV (status ${r.status})`);
  ok(r.text.includes(String(guardA.employeeCode)) && r.text.includes(String(guardB.employeeCode)), `guard tax export lists the run's own guards (run-level legal rows)`);
  r = await request('FINANCE', 'GET', `/guard-payroll/runs/${guardRun._id}/export/pension`);
  ok(r.status === 200 && !r.text.startsWith('{'), `FINANCE guard pension export returns a CSV (status ${r.status})`);
  r = await request('FINANCE', 'GET', `/guard-payroll/records/${String(guardRecA?._id)}/payslip`);
  ok(r.status === 200, `FINANCE guard payslip (status ${r.status})`);

  console.log(`\n${passed} checks passed, ${failed} failed`);
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  await mongoose.disconnect();
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});
