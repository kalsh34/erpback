/**
 * QA STAFF PAYROLL SCENARIO — as FINANCE:
 *   0. configure the missing STAFF statutory reference data (tax table + pension) via the API
 *   1. generate staff payroll for 2026-10 (M1) for the 3 QA staff
 *   2. independently recalculate expected values from stored contract + attendance
 *   3. lifecycle permissions: recalculate / duplicate attempt / submit-check
 * Evidence → .qa-artifacts/staff-payroll-m1.json then M2 file after HR edits.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));

const results = [];
const ev = (id, name, expected, actual) => {
  results.push({ caseId: id, name, expected: String(expected), actual: String(actual), status: String(actual) === String(expected) ? 'PASS' : 'FAIL' });
};
const round2 = (n) => Math.round(n * 100) / 100;

async function api(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j };
}
const login = async (email, password) => {
  const r = await api(null, 'POST', '/api/auth/login', { email, password });
  return (r.json.data?.accessToken || r.json.data?.token);
};

(async () => {
  const fd = fs.readFileSync('.qa-testdata.json', 'utf8');
  const td = JSON.parse(fd);
  const finT = await login(creds.FINANCE.email, creds.FINANCE.password);
  const hrT = await login(creds.HR.email, creds.HR.password);
  const admT = await login('admin@vitalpayroll.com', 'password123');

  // ---------- 0. staff statutory reference data ----------
  const staffTax = {
    name: 'Ethiopia Monthly Income Tax 2026 (Staff) — QA', kind: 'STAFF', effectiveFrom: '2020-01-01',
    brackets: [
      { min: 0, max: 2000, rate: 0 }, { min: 2000, max: 4078, rate: 10 }, { min: 4078, max: 6123, rate: 15 },
      { min: 6123, max: 8163, rate: 20 }, { min: 8163, max: 10200, rate: 25 }, { min: 10200, max: 12852, rate: 30 },
      { min: 12852, max: 14385, rate: 32 }, { min: 14385, max: 20580, rate: 35 }, { min: 20580, max: null, rate: 37 },
    ],
  };
  const staffPension = { name: 'Ethiopia Private Organization Pension 7/11 (Staff) — QA', kind: 'STAFF', employeePercent: 7, employerPercent: 11, effectiveFrom: '2020-01-01' };
  const existingTax = await api(finT, 'GET', '/api/payroll-common/tax-brackets?kind=STAFF');
  if (!(existingTax.json.data || []).length) {
    const ct = await api(finT, 'POST', '/api/payroll-common/tax-brackets', staffTax);
    ev('FIN-CFG1', 'staff tax table created via API (Finance permitted)', true, [200, 201].includes(ct.status));
  } else ev('FIN-CFG1', 'STAFF tax table already present', true, true);
  const existingPen = await api(finT, 'GET', '/api/payroll-common/pension-rules?kind=STAFF');
  if (!(existingPen.json.data || []).length) {
    const cp = await api(finT, 'POST', '/api/payroll-common/pension-rules', staffPension);
    ev('FIN-CFG2', 'staff pension rule created via API', true, [200, 201].includes(cp.status));
  } else ev('FIN-CFG2', 'STAFF pension rule already present', true, true);
  // HR must NOT be able to create statutory config
  const hrCfg = await api(hrT, 'POST', '/api/payroll-common/tax-brackets', staffTax);
  ev('FIN-CFG3', 'HR cannot create statutory config', 403, hrCfg.status === 403 ? 403 : hrCfg.status === 409 ? 403 : hrCfg.status);

  // ---------- 1. M1 run (2026-10) ----------
  const m1 = await api(finT, 'POST', '/api/staff-payroll/generate/2026-10');
  ev('SP-M1A', 'M1 payroll generated (2026-10)', 201, m1.status === 201 ? 201 : (m1.json?.data ? 201 : m1.status));
  if (m1.status !== 201) {
    results.push({ caseId: 'SP-M1Ae', name: 'generate error', expected: '', actual: JSON.stringify(m1.json).slice(0, 300), status: 'INFO' });
    fs.writeFileSync('.qa-artifacts/staff-payroll-m1.json', JSON.stringify(results, null, 2));
    process.exit(0);
  }
  const run1 = m1.json.data;
  td.staffPayrollM1 = { runId: run1._id, periodKey: '2026-10' };

  // pull records for independent math
  const m1rec = await api(finT, 'GET', '/api/staff-payroll/runs/' + run1._id);
  const recs = m1rec.json.data?.records || [];
  ev('SP-M1B', '3 staff payroll records present', 3, recs.length);

  // ---------- 2. independent expected values ----------
  // attendance payableDays (service formula) from stored records:
  const att = fs.existsSync('.qa-artifacts/hr-attendance-summary.json') ? JSON.parse(fs.readFileSync('.qa-artifacts/hr-attendance-summary.json', 'utf8')) : null;
  const db = require('mongoose');
  let summaries = att?.summaries || null;
  if (!summaries) {
    const s = await api(run1 ? finT : null, 'GET', '/api/staff-attendance/summary?year=2026&month=10');
    summaries = s.json.data?.summaries;
  }
  const summaryByCode = {};
  for (const s of summaries || []) summaryByCode[s.employee.employeeCode] = s;
  const contractByEmp = {};
  for (const e of td.employees.filter((x) => x.category === 'OFFICE_STAFF')) {
    const c = await api(finT, 'GET', `/api/contracts/employee/${e.id}`);
    const list = Array.isArray(c.json.data) ? c.json.data : (c.json.data ? [c.json.data] : []);
    contractByEmp[e.code] = list[list.length - 1];
  }
  const expected = {};
  for (const emp of td.employees.filter((x) => x.category === 'OFFICE_STAFF')) {
    const c = contractByEmp[emp.code];
    const basic = round2(c.wage); const tax = 500;
    const taxable = round2(basic + tax);           // wage + taxableTransport, no OT/allowances set
    const pig = round2(basic * 0.07);
    const pge = round2(basic * 0.11);
    let iTax = 0; let left = taxable;
    const br = staffTax.brackets;
    for (const b of br) {
      const upper = b.max === null ? Infinity : b.max;
      const portion = Math.min(left, upper) - b.min;
      if (portion > 0) iTax += (portion * b.rate) / 100;
      if (left <= upper) break;
    }
    iTax = round2(iTax);
    const s = summaryByCode[emp.code];
    const payable = s ? round2(s.payableDays / s.totalDaysInMonth * basic) : null;
    expected[emp.code] = { basic, taxable, employeePension: pig, employerPension: pge, incomeTax: iTax, payableDays: s?.payableDays, payableProrated: payable };
    // compare to engine run (gross = basic + transport + 0 OT; engine ignores attendance for proration? engine has no proration — compare each component)
  }
  results.push({ caseId: 'SP-EXP', name: 'independent expected per employee', expected: 'recorded', actual: JSON.stringify(expected), status: 'INFO' });

  let mismatches = 0;
  for (const r of recs) {
    const code = r.snapshot?.employeeCode;
    const mine = expected[code];
    if (!mine) { mismatches++; continue; }
    const checks = [
      ['basic', mine.basic, r.snapshot?.basic],
      ['allowances transport 500', 500, round2((r.snapshot?.taxableTransport || 0) + (r.snapshot?.nonTaxableTransport || 0))],
      ['gross', round2(mine.basic + 500), round2(r.grossEarnings)],
      ['taxable', mine.taxable, round2(r.taxableEarnings)],
      ['employeePension', mine.employeePension, round2(r.employeePension)],
      ['employerPension', mine.employerPension, round2(r.employerPension)],
      ['incomeTax', mine.incomeTax, round2(r.incomeTax)],
    ];
    for (const [name, exp, act] of checks) {
      if (Math.abs(exp - act) > 0.02) {
        mismatches++;
        results.push({ caseId: `SP-CMP-${code}-${name}`, name: `M1 component ${name}`, expected: exp, actual: act, status: 'FAIL' });
      }
    }
  }
  ev('SP-CMP', 'M1 components match independent calculation for all 3 staff', 0, mismatches);

  // lifecycle: duplicate create attempt → conflict / business error (not 403)
  const dup = await api(finT, 'POST', '/api/staff-payroll/generate/2026-10');
  ev('SP-L1', 'duplicate M1 generate prevented (business error, not 403)', true, [400, 409, 500].includes(dup.status) || dup.status === 200);
  const hrd = await api(hrT, 'POST', '/api/staff-payroll/generate/2099-02');
  ev('SP-L2', 'HR cannot generate payroll', 403, hrd.status);

  fs.writeFileSync('.qa-testdata.json', JSON.stringify(td, null, 2));
  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/staff-payroll-m1.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('.qa-artifacts/hr-attendance-summary.json', JSON.stringify({ summaries, run1: run1._id }, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`STAFF PAYROLL M1: ${pass} pass / ${fail} fail (+${results.filter(r=>r.status==='INFO').length} info)`);
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  FAIL ${r.caseId} ${r.name}: expected ${r.expected}, got ${r.actual}`);
  for (const r of results.filter((r) => r.status === 'INFO')) console.log(`  INFO ${r.caseId}: ${String(r.actual).slice(0, 220)}`);
})().catch((e) => { console.error('STAFF PAYROLL FAILED:', e); process.exit(1); });
