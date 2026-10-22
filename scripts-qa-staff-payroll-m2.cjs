/**
 * QA STAFF PAYROLL M1 VERIFY + M2 — as FINANCE/HR:
 *   1. re-verify all M1 record components against the independent formula
 *   2. HR edits QAS001 contract wage 12000 → 13000 (salary history check)
 *   3. FINANCE generates 2026-11 (M2); verify new values; M1 unchanged
 * Evidence → .qa-artifacts/staff-payroll-m2.json
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));
const round2 = (n) => Math.round(n * 100) / 100;
const BR = [
  { min: 0, max: 2000, rate: 0 }, { min: 2000, max: 4078, rate: 10 }, { min: 4078, max: 6123, rate: 15 },
  { min: 6123, max: 8163, rate: 20 }, { min: 8163, max: 10200, rate: 25 }, { min: 10200, max: 12852, rate: 30 },
  { min: 12852, max: 14385, rate: 32 }, { min: 14385, max: 20580, rate: 35 }, { min: 20580, max: null, rate: 37 },
];
const calc = (taxable) => {
  let tax = 0;
  for (const b of BR) {
    const upper = b.max === null ? Infinity : b.max;
    const portion = Math.min(taxable, upper) - b.min;
    if (portion > 0) tax += (portion * b.rate) / 100;
    if (taxable <= upper) break;
  }
  return round2(tax);
};

const results = [];
const ev = (id, name, expected, actual) => results.push({ caseId: id, name, expected: String(expected), actual: String(actual), status: String(actual) === String(expected) ? 'PASS' : 'FAIL' });

const getToken = (r) => r.json?.data?.accessToken || r.json?.data?.token;

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

(async () => {
  const td = JSON.parse(fs.readFileSync('.qa-testdata.json', 'utf8'));
  const finT = getToken(await api(null, 'POST', '/api/auth/login', { email: creds.FINANCE.email, password: creds.FINANCE.password }));
  const hrT = getToken(await api(null, 'POST', '/api/auth/login', { email: creds.HR.email, password: creds.HR.password }));
  const admT = getToken(await api(null, 'POST', '/api/auth/login', { email: 'admin@vitalpayroll.com', password: 'password123' }));

  // ---- 1. M1 verify ----
  const runs = (await api(finT, 'GET', '/api/staff-payroll/runs').then((r) => r.json.data)) || [];
  const m1 = runs.find((r) => r.periodKey === '2026-10');
  if (!m1) throw new Error('M1 run not found');
  td.staffPayrollM1 = { runId: m1._id, periodKey: '2026-10' };
  const m1rec = await api(finT, 'GET', `/api/staff-payroll/runs/${m1._id}`).then((r) => r.json.data);
  const recs = m1rec.records;
  ev('SP-M1B', 'M1 has 3 staff records', 3, recs.length);

  let mismatch = 0;
  for (const r of recs) {
    const basic = r.snapshot.basic;
    const taxable = round2(basic + r.snapshot.taxableTransport + r.snapshot.responsibilityAllowance + r.snapshot.teleAllowance + r.overtimeAmount);
    const checks = [
      ['gross', round2(basic + r.snapshot.taxableTransport + r.snapshot.nonTaxableTransport + r.overtimeAmount), round2(r.grossEarnings)],
      ['taxable', taxable, round2(r.taxableEarnings)],
      ['employeePension', round2(basic * 0.07), round2(r.employeePension)],
      ['employerPension', round2(basic * 0.11), round2(r.employerPension)],
      ['incomeTax', calc(taxable), round2(r.incomeTax)],
      ['totalDeductions', round2(calc(taxable) + round2(basic * 0.07)), round2(r.totalDeductions)],
      ['netPay', round2(r.grossEarnings - r.totalDeductions), round2(r.netPay)],
    ];
    for (const [name, exp, act] of checks) if (Math.abs(exp - act) > 0.02) { mismatch++; results.push({ caseId: `SP-M1V-${r.snapshot.employeeCode}-${name}`, name: 'M1 ' + name, expected: exp, actual: act, status: 'FAIL' }); }
  }
  ev('SP-M1V', 'all M1 components match independent recalculation', '0 mismatches', `${mismatch} mismatches`);
  const m1Before = recs.map((r) => ({ code: r.snapshot.employeeCode, basic: r.snapshot.basic, net: round2(r.netPay) }));
  results.push({ caseId: 'SP-M1SNAP', name: 'M1 snapshot before edit', expected: 'recorded', actual: JSON.stringify(m1Before), status: 'INFO' });

  // ---- 2. HR salary edit (QAS001 wage 12000 → 13000) ----
  const q1 = td.employees.find((e) => e.code === 'QAS001');
  const q1rec = recs.find((r) => r.snapshot.employeeCode === 'QAS001');
  const contractId = q1rec.snapshot.contractId;
  const edit = await api(hrT, 'PUT', `/api/contracts/${contractId}`, { wage: 13000, notes: 'QA salary increase 2026-11' });
  ev('SP-E1', 'HR edits contract wage (12000→13000)', true, [200, 201].includes(edit.status));
  const recheck = await api(finT, 'GET', `/api/contracts/employee/${q1.id}`).then((r) => r.json.data);
  const cl = Array.isArray(recheck) ? recheck : [recheck];
  ev('SP-E2', 'edited wage persisted', 13000, Number(cl[cl.length - 1]?.wage));
  // salary history recorded?
  const hist = await api(hrT, 'GET', `/api/contracts/employee/${q1.id}/salary-history`);
  const hrows = Array.isArray(hist.json.data) ? hist.json.data.length : (hist.json.data?.length || 0);
  results.push({ caseId: 'SP-E3', name: 'salary history rows after edit', expected: 'recorded', actual: String(hrows), status: hrows > 0 ? 'PASS' : 'FINDING(no salary history rows)' });

  // ---- 3. M2 run ----
  const m2 = await api(finT, 'POST', '/api/staff-payroll/generate/2026-11');
  ev('SP-M2A', 'M2 payroll generated (2026-11)', 201, m2.status);
  const runs2 = (await api(finT, 'GET', '/api/staff-payroll/runs').then((r) => r.json.data)) || [];
  const m2run = runs2.find((r) => r.periodKey === '2026-11');
  if (!m2run) throw new Error('M2 run not found');
  td.staffPayrollM2 = { runId: m2run?._id, periodKey: '2026-11' };
  const m2rec = await api(finT, 'GET', `/api/staff-payroll/runs/${m2run._id}`).then((r) => r.json.data);
  ev('SP-M2B', 'M2 has 3 staff records', 3, m2rec.records.length);
  const q1m2 = m2rec.records.find((r) => r.snapshot.employeeCode === 'QAS001');
  ev('SP-M2V1', 'M2 uses new wage 13000', 13000, q1m2.snapshot.basic);
  const t2 = 13000;
  ev('SP-M2V2', 'M2 tax matches independent calc', calc(t2), q1m2.incomeTax);
  ev('SP-M2V3', 'M2 employeePension = 7% of 13000', round2(t2 * 0.07), round2(q1m2.employeePension));
  ev('SP-M2V4', 'M2 netPay consistent', round2(q1m2.grossEarnings - q1m2.totalDeductions), round2(q1m2.netPay));

  // ---- M1 unchanged after edit ----
  const m1after = await api(finT, 'GET', `/api/staff-payroll/runs/${m1._id}`).then((r) => r.json.data);
  const q1m1after = m1after.records.find((r) => r.snapshot.employeeCode === 'QAS001');
  ev('SP-SNAP', 'M1 snapshot untouched by M2/temporal edit (basic still 12000)', 12000, q1m1after.snapshot.basic);
  ev('SP-SNAP2', 'M1 net unchanged', m1Before.find((x) => x.code === 'QAS001').net, round2(q1m1after.netPay));

  // audit logs prove acting user
  const audit = await api(admT, 'GET', '/api/audit-logs?action=CONTRACT_UPDATE&limit=5').then((r) => r.json);
  const row = (audit.data || []).find((a) => a.entityId === contractId);
  results.push({ caseId: 'SP-AUDIT', name: 'audit log for wage edit (acting user)', expected: 'recorded', actual: row ? `${row.userId?.firstName || row.userId} ${row.action}` : 'NONE', status: row ? 'PASS' : 'FINDING(missing audit row)' });

  fs.writeFileSync('.qa-testdata.json', JSON.stringify(td, null, 2));
  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/staff-payroll-m2.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`STAFF PAYROLL M2: ${pass} pass / ${fail} fail (+${results.filter(r=>r.status!=='PASS'&&r.status!=='FAIL').length} other)`);
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  FAIL ${r.caseId} ${r.name}: expected ${r.expected}, got ${r.actual}`);
  for (const r of results.filter((r) => r.status === 'INFO' || r.status.startsWith('FINDING'))) console.log(`  ${r.status} ${r.caseId} ${r.name}: ${String(r.actual).slice(0, 160)}`);
})().catch((e) => { console.error('M2 FAILED:', e); process.exit(1); });
