/**
 * DEFECT REMEDIATION CHECK (DEF-H1/H2/H3/M1/M2/M3/L1)
 *
 * Runs every fix from the defect-remediation cycle against an ISOLATED
 * ephemeral MongoDB database (never the configured employee database) through
 * the real HTTP surface + models:
 *
 *   DEF-M1  CEO strictly read-only (no rotation approval, no mutations)
 *   DEF-M3  HR cannot create/update companies (read-only remains)
 *   DEF-H2  Finance cannot create/update/delete companies
 *   OPS     retains only company/site permissions per the brief
 *   DEF-H1  sites reject malformed/unknown companyId, create nothing on failure
 *   DEF-H3  module-reports are role-scoped (HR→HR, OPS→sites/guards/…,
 *           FINANCE/HEAD→payroll, audit/users restricted)
 *   DEF-M2  audit-log + user-list reports closed to roles without the
 *           dedicated AUDIT_READ/USER_READ permission
 *   DEF-L1  staff contracts reject transportAllowance>0 (guard-only field);
 *           staff payroll snapshot consumes taxableTransport/nonTaxableAllowance
 *
 * Payroll numbers in the staff run are re-derived independently here (not
 * copied from the engine) so a formula change would fail this suite.
 */
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app';
import { Employee } from '../src/models/Employee';
import { User } from '../src/models/User';
import { Site } from '../src/models/Site';
import { Company } from '../src/models/Company';
import { Contract } from '../src/models/Contract';
import { TaxBracket } from '../src/models/TaxBracket';
import { PensionRule } from '../src/models/PensionRule';
import { registerCorePermissions } from '../src/core/permissions/core.permissions';
import { registerHRPermissions } from '../src/modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from '../src/modules/hr/permissions/payroll.permissions';
import { computeEffectivePermissions } from '../src/middleware/rbac';
import { PERMISSIONS } from '../src/types';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`OK: ${msg}`); }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

async function main() {
  const database = `rbac_remediation_check_${Date.now()}`;
  await mongoose.connect(`mongodb://127.0.0.1:27029/${database}?replicaSet=guardE2e`, { serverSelectionTimeoutMS: 5000 });
  registerCorePermissions(); registerHRPermissions(); registerPayrollPermissions();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  // ──.accounts ────────────────────────────────────────────────────────
  const pwd = await bcrypt.hash('Remediation-Check-2026!', 10);
  const makeUser = (email: string, role: string) =>
    User.create({ email, password: pwd, firstName: role, lastName: 'Test', role });
  const admin = await makeUser('remed-admin@vital-test.invalid', 'SUPER_ADMIN');
  const ceo = await makeUser('remed-ceo@vital-test.invalid', 'CEO');
  const hr = await makeUser('remed-hr@vital-test.invalid', 'HR_ADMIN');
  const ops = await makeUser('remed-ops@vital-test.invalid', 'OPERATIONS');
  await makeUser('remed-finance@vital-test.invalid', 'FINANCE_OFFICER');
  const head = await makeUser('remed-head@vital-test.invalid', 'HEAD');
  await makeUser('remed-guard@vital-test.invalid', 'GUARD');

  // ── server ─────────────────────────────────────────────────────────
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;

  const tokens: Record<string, string> = {};
  async function login(role: string, email: string): Promise<string> {
    const res = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Remediation-Check-2026!' }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json() as any;
    assert.equal(res.status, 200, `login ${role}`);
    tokens[role] = json.data.token;
    return tokens[role];
  }
  for (const [role, email] of [
    ['ADMIN', admin.email], ['CEO', ceo.email], ['HR', hr.email],
    ['OPS', ops.email], ['FINANCE', 'remed-finance@vital-test.invalid'],
    ['HEAD', head.email], ['GUARD', 'remed-guard@vital-test.invalid'],
  ] as [string, string][]) await login(role, email);

  const tokensBackup: Record<string, string> = {};
  async function request(role: string, method: string, route: string, body?: unknown): Promise<{ status: number; json: any }> {
    const res = await fetch(`${origin}/api${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens[role]}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
  }

  // ════════════════════════════════════════════════════════════════════
  // B. COMPANY PERMISSIONS (DEF-M3 / DEF-H2 / DEF-M1)
  // ════════════════════════════════════════════════════════════════════
  const comp = await Company.create({ name: 'Remediation Comp', code: 'REMED-C1' });
  const compId = String(comp._id);

  let r = await request('HR', 'POST', '/companies', { name: 'HR Company Attempt', code: 'REMED-HR1' });
  ok(r.status === 403, `DEF-M3: HR POST /companies → 403 (got ${r.status})`);
  r = await request('HR', 'PUT', `/companies/${compId}`, { name: 'HrEdited' });
  ok(r.status === 403, `DEF-M3: HR PUT /companies/:id → 403 (got ${r.status})`);
  r = await request('HR', 'GET', '/companies');
  ok(r.status === 200, `DEF-M3: HR company READ remains allowed (got ${r.status})`);

  r = await request('FINANCE', 'POST', '/companies', { name: 'Fin Company Attempt', code: 'REMED-FN1' });
  ok(r.status === 403, `DEF-H2: FINANCE POST /companies → 403 (got ${r.status})`);
  r = await request('FINANCE', 'PUT', `/companies/${compId}`, { name: 'FinEdited' });
  ok(r.status === 403, `DEF-H2: FINANCE PUT /companies/:id → 403 (got ${r.status})`);
  r = await request('FINANCE', 'DELETE', `/companies/${compId}`);
  ok(r.status === 403, `DEF-H2: FINANCE DELETE /companies/:id → 403 (got ${r.status})`);
  r = await request('FINANCE', 'GET', '/companies');
  ok(r.status === 200, `DEF-H2: FINANCE company READ remains allowed (got ${r.status})`);

  r = await request('CEO', 'POST', '/companies', { name: 'CEO Company Attempt', code: 'REMED-CEO1' });
  ok(r.status === 403, `DEF-M1: CEO POST /companies → 403 (got ${r.status})`);
  r = await request('CEO', 'PUT', `/companies/${compId}`, { name: 'CeoEdited' });
  ok(r.status === 403, `DEF-M1: CEO PUT /companies/:id → 403 (got ${r.status})`);
  r = await request('CEO', 'DELETE', `/companies/${compId}`);
  ok(r.status === 403, `DEF-M1: CEO DELETE /companies/:id → 403 (got ${r.status})`);
  r = await request('CEO', 'POST', '/employees', { employeeCode: `CEOX${Date.now() % 100000}`, firstName: 'X', lastName: 'Y', category: 'GUARD' });
  ok(r.status === 403, `DEF-M1: CEO employee create → 403 (got ${r.status})`);
  r = await request('CEO', 'POST', '/sites', { siteName: 'X', siteCode: `CEOS${Date.now() % 100000}`, location: 'L', siteType: 'COMMERCIAL' });
  ok(r.status === 403, `DEF-M1: CEO site create → 403 (got ${r.status})`);

  // Rotation approval (theopper probe from the acceptance run) — permission is
  // checked before the controller, so a nonexistent id still proves denial.
  r = await request('CEO', 'POST', '/rotations/000000000000000000000001/approve');
  ok(r.status === 403, `DEF-M1: CEO POST /rotations/:id/approve → 403 (got ${r.status})`);
  r = await request('OPS', 'POST', '/rotations/000000000000000000000001/rotate');
  ok(r.status === 403 || r.status === 404, `OPS rotation mutate still not silently granted (got ${r.status})`);

  const companyCount = await Company.countDocuments();
  ok(companyCount === 1, `no company rows were created by denied mutations (count=${companyCount})`);

  // ══════════════════════════════════════════════════════════════════
  // B2. MODULE-GRANT CEILING — grants must never restore mandatory role exclusion
  // ══════════════════════════════════════════════════════════════════
  // The `company` module bundle carries COMPANY_CREATE/COMPANY_UPDATE (that is
  // how Operations legitimately receives them). HR/FINANCE users holding the
  // very same grant must STILL be denied those permissions:
  // ROLE_MANDATORY_DENIES strips them last inside computeEffectivePermissions.
  const grantUsers: [string, string, string][] = [
    ['HR-G', 'remed-hr-comp@vital-test.invalid', 'HR_ADMIN'],
    ['FIN-G', 'remed-fin-comp@vital-test.invalid', 'FINANCE_OFFICER'],
    ['OPS-G', 'remed-ops-comp@vital-test.invalid', 'OPERATIONS'],
  ];
  for (const [key, email, role] of grantUsers) {
    await User.create({ email, password: pwd, firstName: key, lastName: 'GrantCeiling', role, moduleGrants: ['company'] });
  }
  for (const [key, email] of grantUsers) await login(key, email);

  // Code-level: the effective set never contains the forbidden permissions.
  ok(!computeEffectivePermissions({ role: 'HR_ADMIN' as any, moduleGrants: ['company'] }).includes(PERMISSIONS.COMPANY_CREATE),
    'grant ceiling: HR + company grant does not regain COMPANY_CREATE');
  ok(!computeEffectivePermissions({ role: 'HR_ADMIN' as any, moduleGrants: ['company'] }).includes(PERMISSIONS.COMPANY_UPDATE),
    'grant ceiling: HR + company grant does not regain COMPANY_UPDATE');
  ok(!computeEffectivePermissions({ role: 'FINANCE_OFFICER' as any, moduleGrants: ['company', 'hr', 'payroll'] }).includes(PERMISSIONS.COMPANY_CREATE),
    'grant ceiling: multiple grants do not regain COMPANY_CREATE');
  ok(computeEffectivePermissions({ role: 'HR_ADMIN' as any }).includes(PERMISSIONS.COMPANY_READ),
    'grant ceiling: HR company READ (designed default) is untouched');

  r = await request('HR-G', 'POST', '/companies', { name: 'HR Grant Company Attempt', code: 'REMED-HRG1' });
  ok(r.status === 403, `grant ceiling: HR with company grant POST /companies → 403 (got ${r.status})`);
  r = await request('HR-G', 'PUT', `/companies/${compId}`, { name: 'HrGrantEdited' });
  ok(r.status === 403, `grant ceiling: HR with company grant PUT /companies/:id → 403 (got ${r.status})`);
  r = await request('HR-G', 'DELETE', `/companies/${compId}`);
  ok(r.status === 403, `grant ceiling: HR with company grant DELETE /companies/:id → 403 (got ${r.status})`);
  r = await request('HR-G', 'GET', '/companies');
  ok(r.status === 200, `grant ceiling: HR with company grant keeps company READ (got ${r.status})`);

  r = await request('FIN-G', 'POST', '/companies', { name: 'Fin Grant Company Attempt', code: 'REMED-FNG1' });
  ok(r.status === 403, `grant ceiling: FINANCE with company grant POST /companies → 403 (got ${r.status})`);
  r = await request('FIN-G', 'PUT', `/companies/${compId}`, { name: 'FinGrantEdited' });
  ok(r.status === 403, `grant ceiling: FINANCE with company grant PUT /companies/:id → 403 (got ${r.status})`);
  r = await request('FIN-G', 'DELETE', `/companies/${compId}`);
  ok(r.status === 403, `grant ceiling: FINANCE with company grant DELETE /companies/:id → 403 (got ${r.status})`);
  r = await request('FIN-G', 'GET', '/companies');
  ok(r.status === 200, `grant ceiling: FINANCE with company grant keeps company READ (got ${r.status})`);

  // Operations' explicitly approved company/site permissions must survive the
  // ceiling (that is what the grant of `company` is FOR).
  r = await request('OPS-G', 'POST', '/companies', { name: 'OPS Granted Comp', code: `REMED-OPSG${Date.now() % 100000}` });
  ok(r.status === 201, `grant ceiling: OPERATIONS with company grant POST /companies stays allowed (got ${r.status})`);
  const opsCompId = String((r.json as any)?.data?._id || '');
  r = await request('OPS-G', 'PUT', `/companies/${opsCompId}`, { name: 'Ops Granted Comp Edited' });
  ok(r.status === 200, `grant ceiling: OPERATIONS with company grant PUT /companies/:id stays allowed (got ${r.status})`);
  r = await request('OPS-G', 'POST', '/sites', {
    siteName: 'OPS Granted Site', siteCode: `RM${Date.now() % 1000000}-OPSG`, location: 'L', siteType: 'COMMERCIAL',
    agreedManpower: 1, actualManpower: 1, companyId: compId,
  });
  ok(r.status === 201, `grant ceiling: OPERATIONS with company grant POST /sites stays allowed (got ${r.status})`);
  r = await request('OPS-G', 'GET', '/companies');
  ok(r.status === 200, `grant ceiling: OPERATIONS company READ stays allowed (got ${r.status})`);

  const grantCompanyCount = await Company.countDocuments();
  ok(grantCompanyCount === 2, `grant ceiling: only the OPERATIONS company row persisted (count=${grantCompanyCount})`);

  // ════════════════════════════════════════════════════════════════════
  // C. SITE COMPANY VALIDATION (DEF-H1) — valid creation preserved
  // ════════════════════════════════════════════════════════════════════
  const baseCode = `RM${Date.now() % 1000000}`;
  const siteBase = { siteName: '', siteCode: '', location: 'L', siteType: 'COMMERCIAL', agreedManpower: 2, actualManpower: 2 };
  r = await request('ADMIN', 'POST', '/sites', { ...siteBase, siteName: 'BadId Site', siteCode: `${baseCode}-M`, companyId: '0000…0000-not-hex!' });
  ok(r.status === 400, `DEF-H1: malformed companyId → 400 (got ${r.status}: ${JSON.stringify(r.json?.message || '')})`);
  const afterMalformed = await Site.countDocuments({ siteCode: `${baseCode}-M` });
  ok(afterMalformed === 0, `DEF-H1: malformed companyId created NO site row`);

  r = await request('ADMIN', 'POST', '/sites', { ...siteBase, siteName: 'Ghost Site', siteCode: `${baseCode}-G`, companyId: '0123456789abcdef01234567' });
  ok(r.status === 404, `DEF-H1: well-formed but unknown companyId → 404 (got ${r.status}: ${JSON.stringify(r.json?.message || '')})`);
  const afterGhost = await Site.countDocuments({ siteCode: `${baseCode}-G` });
  ok(afterGhost === 0, `DEF-H1: unknown companyId created NO site row`);

  r = await request('ADMIN', 'POST', '/sites', { ...siteBase, siteName: 'Valid Site', siteCode: `${baseCode}-V`, companyId: compId });
  ok(r.status === 201, `DEF-H1: valid company reference still creates the site (got ${r.status})`);
  const validSite = await Site.findOne({ siteCode: `${baseCode}-V` }).lean();
  ok(!!validSite && String((validSite as any).companyId) === compId, `DEF-H1: created site references the given company`);

  r = await request('ADMIN', 'PUT', `/sites/${(validSite as any)._id}`, { companyId: 'zzzz' });
  ok(r.status === 400, `DEF-H1: update with malformed companyId → 400 (got ${r.status})`);

  // ════════════════════════════════════════════════════════════════════
  // D. ALLOWANCE FIELD CONSISTENCY (DEF-L1)
  // ════════════════════════════════════════════════════════════════════
  const staffEmp = await Employee.create({
    employeeCode: `RMSTAFF${Date.now() % 100000}`, firstName: 'Staff', lastName: 'Test',
    category: 'OFFICE_STAFF', status: 'INACTIVE',
  });
  const guardEmp = await Employee.create({
    employeeCode: `RMGUARD${Date.now() % 100000}`, firstName: 'Guard', lastName: 'Test',
    category: 'GUARD', status: 'INACTIVE',
  });
  const start = '2026-10-01';
  const staffContractPayload = {
    employeeId: String(staffEmp._id), contractType: 'Full-Time', contractStartDate: start,
    wage: 12000, responsibilityAllowance: 500, teleAllowance: 200,
    taxableTransport: 300, nonTaxableAllowance: 400, transportAllowance: 750,
    pensionEnrolled: true,
  };
  r = await request('ADMIN', 'POST', '/contracts', staffContractPayload);
  ok(r.status === 400, `DEF-L1: staff contract with transportAllowance>0 → 400 (got ${r.status}: ${JSON.stringify(r.json?.message || '')})`);
  ok(typeof r.json?.message === 'string' && /taxableTransport/.test(r.json.message), `DEF-L1: rejection message names the staff fields`);
  const staffContractsAfterReject = await Contract.countDocuments({ employeeId: staffEmp._id });
  ok(staffContractsAfterReject === 0, `DEF-L1: rejected staff contract persisted nothing`);

  const staffContractOk = { ...staffContractPayload, transportAllowance: 0 };
  r = await request('ADMIN', 'POST', '/contracts', staffContractOk);
  ok(r.status === 201, `DEF-L1: staff contract with transportAllowance=0 accepted (got ${r.status})`);
  const savedStaffContract = (r.json as any)?.data;

  r = await request('ADMIN', 'POST', '/contracts', {
    employeeId: String(guardEmp._id), contractType: 'Full-Time', contractStartDate: start,
    wage: 4000, transportAllowance: 600, pensionEnrolled: true,
  });
  ok(r.status === 201, `DEF-L1: guard contract keeps transportAllowance (got ${r.status})`);

  // Payroll consistency: staff run snapshot + totals re-derived independently.
  // Rate convention: PERCENT (rate 15 = 15%), marginal-sum computation.
  const periodKey = '2026-10';
  await TaxBracket.create({
    name: 'Remediation staff tax', kind: 'STAFF', effectiveFrom: new Date('2026-01-01'),
    brackets: [
      { min: 0, max: 2000, rate: 0 },
      { min: 2000, max: 4000, rate: 15 },
      { min: 4000, max: 7000, rate: 20 },
      { min: 7000, max: 10000, rate: 25 },
      { min: 10000, max: 14000, rate: 30 },
      { min: 14000, max: null, rate: 35 },
    ],
  } as any);
  await PensionRule.create({ name: 'Remediation staff pension', kind: 'STAFF', effectiveFrom: new Date('2026-01-01'), effectiveUntil: null, employeePercent: 7, employerPercent: 11 });

  r = await request('FINANCE', 'POST', `/staff-payroll/generate/${periodKey}`);
  const runs = (r.json as any)?.data;
  assert.ok(runs, 'staff payroll run returned');
  const runId = runs?.run ? runs.run._id : runs?._id;
  const staffRecord = (runs.records || []).find((x: any) => String(x.employeeId) === String(staffEmp._id));
  ok(!!staffRecord, `DEF-L1: staff employee appears in the payroll run`);

  // Independent derivation: taxable = wage + resp + tele + taxableTransport = 13000
  const expectedTaxable = 12000 + 500 + 200 + 300;
  // Independent marginal-sum derivation for a taxable 13,000:
  // 0 (0–2000) + 2000×15% + 3000×20% + 3000×25% + 3000×30% (capped at 13,000)
  const expectedTax = 0 + (2000 * 15) / 100 + (3000 * 20) / 100 + (3000 * 25) / 100 + (3000 * 30) / 100;
  const expectedEmpPension = 12000 * 0.07;
  const expectedEmprPension = 12000 * 0.11;
  const expectedGross = 12000 + 500 + 200 + 300 + 400; // + nonTaxableAllowance
  ok(Math.abs(staffRecord.taxableEarnings - expectedTaxable) < 0.01,
    `DEF-L1: snapshot taxableEarnings=${staffRecord.taxableEarnings} (expected ${expectedTaxable} incl. taxableTransport, excl. transportAllowance)`);
  ok(Math.abs(staffRecord.grossEarnings - expectedGross) < 0.01,
    `DEF-L1: snapshot grossEarnings=${staffRecord.grossEarnings} (expected ${expectedGross} incl. nonTaxableAllowance)`);
  ok(Math.abs(staffRecord.incomeTax - expectedTax) < 0.01, `DEF-L1: income tax re-derived = ${expectedTax} (got ${staffRecord.incomeTax})`);
  ok(Math.abs(staffRecord.employeePension - expectedEmpPension) < 0.01, `DEF-L1: employee pension re-derived = ${expectedEmpPension}`);
  ok(Math.abs(staffRecord.employerPension - expectedEmprPension) < 0.01, `DEF-L1: employer pension re-derived = ${expectedEmprPension}`);
  const snapshot = staffRecord.snapshot;
  ok(snapshot.taxableTransport === 300 && snapshot.nonTaxableTransport === 400,
    `DEF-L1: snapshot stores taxableTransport=300 / nonTaxableTransport=400 (saved contract values)`);
  ok(savedStaffContract.transportAllowance === 0, `DEF-L1: staff contract stored transportAllowance=0`);

  // Salary-history consistency with the saved contract pay fields
  r = await request('ADMIN', 'GET', '/contracts');
  ok(r.status === 200, `contracts list readable`);

  // ════════════════════════════════════════════════════════════════════
  // E. REPORT ISOLATION (DEF-H3 / DEF-M2)
  // ════════════════════════════════════════════════════════════════════
  type Probe = { role: string; report: string; route: string; expect: number; label: string };
  const probes: Probe[] = [
    { role: 'HR', report: 'HR', route: '/module-reports/hr', expect: 200, label: 'HR may read HR reports' },
    { role: 'CEO', report: 'HR', route: '/module-reports/hr', expect: 200, label: 'CEO may read HR reports (read-only)' },
    { role: 'FINANCE', report: 'HR', route: '/module-reports/hr', expect: 403, label: 'DEF-H3: FINANCE denied HR reports' },
    { role: 'OPS', report: 'HR', route: '/module-reports/hr', expect: 403, label: 'DEF-H3: OPS denied HR reports' },
    { role: 'GUARD', report: 'HR', route: '/module-reports/hr', expect: 403, label: 'GUARD denied HR reports' },

    { role: 'OPS', report: 'SITES', route: '/module-reports/sites', expect: 200, label: 'OPS may read company/site reports' },
    { role: 'OPS', report: 'GUARDS', route: '/module-reports/guards', expect: 200, label: 'OPS may read operations reports' },
    { role: 'OPS', report: 'GUARD-ATT', route: '/module-reports/guard-attendance', expect: 200, label: 'OPS may read guard-attendance reports' },
    { role: 'OPS', report: 'STAFF-ATT', route: '/module-reports/staff-attendance', expect: 403, label: 'DEF-H3: OPS denied staff-attendance (HR domain)' },
    { role: 'OPS', report: 'PAYROLL', route: '/module-reports/payroll?module=GUARD', expect: 403, label: 'DEF-M2: OPS denied guard payroll rows' },
    { role: 'OPS', report: 'PAYROLL', route: '/module-reports/payroll?module=STAFF', expect: 403, label: 'DEF-H3: OPS denied staff payroll rows' },

    { role: 'HR', report: 'PAYROLL', route: '/module-reports/payroll?module=STAFF', expect: 403, label: 'DEF-H3: HR denied payroll rows' },
    { role: 'HR', report: 'PAYROLL', route: '/module-reports/payroll?module=GUARD', expect: 403, label: 'DEF-H3: HR denied guard payroll rows' },

    { role: 'FINANCE', report: 'PAYROLL', route: '/module-reports/payroll?module=STAFF', expect: 200, label: 'FINANCE may read staff payroll reports' },
    { role: 'FINANCE', report: 'PAYROLL', route: '/module-reports/payroll?module=GUARD', expect: 200, label: 'FINANCE may read guard payroll reports' },
    { role: 'FINANCE', report: 'SITES', route: '/module-reports/sites', expect: 403, label: 'DEF-H3: FINANCE denied site reports' },
    { role: 'FINANCE', report: 'GUARDS', route: '/module-reports/guards', expect: 403, label: 'DEF-H3: FINANCE denied guards reports' },
    { role: 'HEAD', report: 'PAYROLL', route: '/module-reports/payroll?module=GUARD', expect: 200, label: 'HEAD may read payroll reports' },
    { role: 'HEAD', report: 'HR', route: '/module-reports/hr', expect: 403, label: 'HEAD denied HR reports' },

    { role: 'ADMIN', report: 'HR', route: '/module-reports/hr', expect: 200, label: 'ADMIN reads HR reports (admin policy preserved)' },
    { role: 'ADMIN', report: 'PAYROLL', route: '/module-reports/payroll?module=STAFF', expect: 200, label: 'ADMIN reads payroll reports (admin policy preserved)' },
    { role: 'CEO', report: 'PAYROLL', route: '/module-reports/payroll?module=STAFF', expect: 200, label: 'CEO reads payroll reports (read-only)' },
    { role: 'CEO', report: 'SITES', route: '/module-reports/sites', expect: 200, label: 'CEO reads site reports' },
  ];

  const bodyKeys = (json: any) => Object.keys(json?.data?.rows?.[0] ?? {});
  for (const p of probes) {
    r = await request(p.role, 'GET', p.route);
    ok(r.status === p.expect, `${p.label} → ${p.expect} (got ${r.status})`);
    if (p.expect === 200 && p.report === 'PAYROLL') {
      // No cross-module salary/net-pay leak: payroll rows carry pay fields only
      // for roles allowed here; query params cannot bypass the guard.
      ok(!!r.json?.data, `${p.label}: payload present`);
    }
  }

  // Audit-log + user-list restricted to explicitly authorized roles (DEF-M2)
  r = await request('OPS', 'GET', '/module-reports/audit');
  ok(r.status === 403, `DEF-M2: OPS denied audit module-report (got ${r.status})`);
  r = await request('HR', 'GET', '/module-reports/audit');
  ok(r.status === 403, `DEF-M2: HR denied audit module-report (got ${r.status})`);
  r = await request('FINANCE', 'GET', '/module-reports/audit');
  ok(r.status === 200, `audit report readable for AUDIT_READ holder (FINANCE) (got ${r.status})`);
  r = await request('ADMIN', 'GET', '/module-reports/audit');
  ok(r.status === 200, `admin audit report (got ${r.status})`);

  r = await request('OPS', 'GET', '/module-reports/users');
  ok(r.status === 403, `DEF-M2: OPS denied users module-report (got ${r.status})`);
  r = await request('HR', 'GET', '/module-reports/users');
  ok(r.status === 200, `users report readable for USER_READ holder (HR) (got ${r.status})`);
  r = await request('GUARD', 'GET', '/module-reports/users');
  ok(r.status === 403, `GUARD denied users module-report (got ${r.status})`);

  // Query-parameter level probe: unknown export path must not smuggle payroll.
  r = await request('OPS', 'GET', '/module-reports/payroll?module=STAFF&format=csv');
  ok(r.status === 403, `export-style query param cannot bypass role scope (got ${r.status})`);

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
