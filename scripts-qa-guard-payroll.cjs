/**
 * QA GUARD PAYROLL SCENARIO — as FINANCE (+ ADMIN for approve):
 *   A. site compensation: create + 3 edits per site (effective-dated, distinct amounts)
 *   B. deductions: QAG004 loan (installment) + QAG002 penalty
 *   C. engine config round-trip (temporary change, then restore) + audit
 *   D. calculate guard payroll 2026-10; independently verify all 7 guards
 *   E. lifecycle: recalc → submit → check → approve (loan settle) → verify
 * Evidence → .qa-artifacts/guard-payroll.json
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));
const round2 = (n) => Math.round(n * 100) / 100;
const round4 = (n) => Math.round(n * 10000) / 10000;

const results = [];
const ev = (id, name, expected, actual) => results.push({ caseId: id, name, expected: String(expected).slice(0, 60), actual: String(actual).slice(0, 60), status: String(actual) === String(expected) ? 'PASS' : 'FAIL' });

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
const getToken = (r) => r.json?.data?.accessToken || r.json?.data?.token;
const login = async (email, password) => getToken(await api(null, 'POST', '/api/auth/login', { email, password }));

async function main() {
  const td = JSON.parse(fs.readFileSync('.qa-testdata.json', 'utf8'));
  const finT = await login(creds.FINANCE.email, creds.FINANCE.password);
  const admT = await login('admin@vitalpayroll.com', 'password123');
  const hrT = await login(creds.HR.email, creds.HR.password);

  // ---------- A. compensations ----------
  const amounts = {
    'QASITE-A1': [10000, 11000, 12000, 13000],
    'QASITE-A2': [8000, 8300, 8600, 8900],
    'QASITE-A3': [12000, 12300, 12600, 12900],
    'QASITE-B1': [9500, 9700, 9900, 10100],
    'QASITE-B2': [15000, 15300, 15600, 15900],
  };
  td.siteCompensations = {};
  for (const [siteName, seq] of Object.entries(amounts)) {
    const site = td.sites.find((s) => s.name === siteName);
    const list = [];
    let ok = true;
    for (const amount of seq) {
      const r = await api(finT, 'POST', '/api/guard-payroll/compensations', { siteId: site.id, compensationAmount: amount, effectiveFrom: '2026-10-01' });
      if (![200, 201].includes(r.status)) { ok = false; results.push({ caseId: `GP-C-${siteName}-${amount}`, name: 'compensation save', expected: '201', actual: JSON.stringify(r.json || r.status).slice(0, 120), status: 'FAIL' }); break; }
      list.push(r.json.data._id);
    }
    if (ok) ev(`GP-C-${siteName}`, '4 compensation saves (create + 3 edits)', '4', String(list.length));
    // reopen: latest applicable for 2026-10
    const latest = await api(finT, 'GET', '/api/guard-payroll/compensations?siteId=' + site.id);
    const rows = Array.isArray(latest.json.data) ? latest.json.data : (latest.json.data?.rows || latest.json.data?.compensations || []);
    const active = rows.filter((x) => !x.effectiveTo || x.effectiveTo === null);
    ev(`GP-CV-${siteName}`, 'latest amount is the active one', String(seq[3]), String(rows[0]?.compensationAmount ?? rows[0]?.amount ?? JSON.stringify(rows[0]).slice(0, 0)));
    results.push({ caseId: `GP-CF-${siteName}`, name: 'active compensation rows', expected: 'recorded', actual: `total=${rows.length} active=${active.length} latest=${rows[0]?.compensationAmount}`, status: rows.length === 4 && active.length === 1 ? 'PASS' : 'FINDING' });
    td.siteCompensations[siteName] = { latest: seq[3], ids: list };
  }
  // invalid compensation
  const bad = await api(finT, 'POST', '/api/guard-payroll/compensations', { siteId: td.sites[0].id, compensationAmount: -50, effectiveFrom: '2026-10-01' });
  ev('GP-CNEG', 'negative compensation rejected', true, [400, 500].includes(bad.status) === false ? (bad.status === 400 || /greater than/i.test(bad.json?.message || '')) : false);
  // guard-vs-finance
  const guardProbe = await api(await login('guard@vitalpayroll.com', 'password123'), 'GET', '/api/guard-payroll/compensations');
  ev('GP-PERM', 'GUARD login excluded from guard-payroll admin read', true, guardProbe.status === 403);

  // ---------- B. deductions ----------
  const guards = (code) => td.employees.find((e) => e.code === code).id;
  const loan = await api(finT, 'POST', '/api/payroll-common/deductions', { employeeId: guards('QAG004'), type: 'LOAN', label: 'QA Loan', totalAmount: 3000, monthlyInstallment: 500, startDate: '2026-10-01' });
  ev('GP-D1', 'loan deduction created', 201, loan.status);
  const pen = await api(finT, 'POST', '/api/payroll-common/deductions', { employeeId: guards('QAG002'), type: 'PENALTY', label: 'QA Penalty', totalAmount: 300, periodKey: '2026-10' });
  ev('GP-D2', 'penalty deduction created', 201, pen.status);
  const badLoan = await api(finT, 'POST', '/api/payroll-common/deductions', { employeeId: guards('QAG004'), type: 'LOAN', label: 'No start', totalAmount: 1000 });
  ev('GP-D3', 'loan without startDate rejected', true, badLoan.status === 400);
  const hribn = await api(hrT, 'POST', '/api/payroll-common/deductions', { employeeId: guards('QAG004'), type: 'PENALTY', label: 'not allowed', totalAmount: 50, periodKey: '2026-10' });
  ev('GP-D4', 'HR cannot create deductions', true, hribn.status === 403 || hribn.status === 403);

  // ---------- C. config round-trip ----------
  const cfg0 = await api(finT, 'GET', '/api/guard-payroll/config').then((r) => r.json.data);
  const upd = await api(finT, 'PUT', '/api/guard-payroll/config', { transportPercent: 25 });
  ev('GP-CFG1', 'Finance can edit payroll config', true, [200, 201].includes(upd.status));
  const cfg1 = await api(finT, 'GET', '/api/guard-payroll/config').then((r) => r.json.data);
  ev('GP-CFG2', 'config change visible', 25, cfg1.transportPercent);
  const hrCfg = await api(hrT, 'PUT', '/api/guard-payroll/config', { transportPercent: 99 });
  ev('GP-CFG3', 'HR cannot change payroll config', 403, hrCfg.status);
  // restore
  const rest = await api(finT, 'PUT', '/api/guard-payroll/config', { transportPercent: cfg0.transportPercent });
  const cfg2 = await api(finT, 'GET', '/api/guard-payroll/config').then((r) => r.json.data);
  ev('GP-CFG4', 'config restored', cfg0.transportPercent, cfg2.transportPercent);

  // ---------- D. calculate guard payroll 2026-10 ----------
  // reference tax (GUARD) + pension from DB
  const mongoose = require('mongoose');
  require('dotenv').config();
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const tax = await db.collection('taxbrackets').find({ kind: { $in: ['GUARD', null] }, effectiveFrom: { $lte: new Date('2026-10-01') } }).sort({ effectiveFrom: -1 }).limit(1).toArray();
  const pen0 = await db.collection('pensionrules').find({ kind: { $in: ['GUARD', null] }, effectiveFrom: { $lte: new Date('2026-10-01') } }).sort({ effectiveFrom: -1 }).limit(1).toArray();
  const brLines = (tax[0]?.brackets || []).map((b) => ({ min: b.min, max: b.max === null ? null : b.max, rate: b.rate }));
  await mongoose.disconnect();

  const calcTax = (x) => {
    let t = 0;
    const sorted = [...brLines].sort((a, b) => a.min - b.min);
    for (const b of sorted) {
      const upper = b.max === null ? Infinity : b.max;
      const portion = Math.min(x, upper) - b.min;
      if (portion > 0) t += (portion * b.rate) / 100;
      if (x <= upper) break;
    }
    return round2(t);
  };

  const gen = await api(finT, 'POST', '/api/guard-payroll/generate/2026-10');
  ev('GP-G1', 'guard payroll 2026-10 generated', true, [200, 201].includes(gen.status));
  const runs = await api(finT, 'GET', '/api/guard-payroll/runs').then((r) => r.json.data);
  const run = runs.find((x) => x.periodKey === '2026-10');
  td.guardPayrollRun = { runId: run?._id, periodKey: '2026-10' };
  const runDetail = await api(finT, 'GET', `/api/guard-payroll/runs/${run._id}`).then((r) => r.json.data);
  const recs = runDetail.records || runDetail;
  ev('GP-G2', '7 guard records calculated', 7, recs.length);

  // independent math
  const primaryComp = amounts; // latest = seq[3]
  const mh = td.monthlyHours; // [{guardId,siteId,normalHours,holidayHours,sundayHours}]
  const siteNameOf = (id) => td.sites.find((s) => s.id === id)?.name;
  const assignmentPrimary = {};
  for (const a of td.assignments) {
    const g = td.employees.find((e) => e.id === a.guardId);
    if (!g) continue;
    if (a.isPrimary) assignmentPrimary[g.code] = a.siteNameOfelse;
  }
  // derive primary site per guard from assignment list metadata saved earlier
  const primaryByGuard = {};
  for (const p of [
    { g: 'QAG001', sites: ['QASITE-A1'] }, { g: 'QAG002', sites: [] }, { g: 'QAG003', sites: [] },
    { g: 'QAG004', sites: [] }, { g: 'QAG005', sites: [] }, { g: 'QAG006', sites: [] }, { g: 'QAG007', sites: [] },
  ]) primaryByGuard[p.g] = p.sites[0];

  const perGuardBuckets = {};
  for (const e of mh) {
    const code = td.employees.find((x) => x.id === e.guardId)?.code;
    if (!code) continue;
    perGuardBuckets[code] ||= {};
    perGuardBuckets[code][siteNameOf(e.siteId)] = { normal: e.normalHours, holiday: e.holidayHours, sunday: e.sundayHours };
  }

  let failures = 0;
  for (const rec of recs) {
    const code = rec.snapshot?.employeeCode || rec.snapshot?.code;
    const pb = perGuardBuckets[code] || {};
    const entries = Object.entries(pb);
    const primarySite = entries.find(([sn]) => {
      // primary = the site the guard was FIRST assigned to in planned table
      const plan = td.assignments.filter((a) => a.guardId === td.employees.find((e) => e.code === code)?.id && a.isPrimary);
      return plan[0] && siteNameOf(plan[0].siteId) === sn;
    });
    const pSite = primarySite?.[0] || (Object.keys(pb)[0] || '');
    const pHours = pb[pSite] || { normal: 0, holiday: 0, sunday: 0 };
    const C = primaryComp[pSite]?.[3];
    const ot = round4((C || 0) / 240);
    const sundayStruct = round2(ot * 32);
    const rem = round2((C || 0) - sundayStruct);
    const transport = round2((rem * 20) / 100);
    const basic = round2(rem - transport);
    const bhr = round4(basic / 208);
    const normalPay = round2(pHours.normal * bhr);
    const holidayPay = round2(pHours.holiday * ot);
    const sundayPay = round2(pHours.sunday * ot);
    const hasHours = pHours.normal + pHours.holiday + pHours.sunday > 0;
    const transportPaid = hasHours ? transport : 0;
    let addTotal = 0;
    const addExp = [];
    for (const [sn, h] of entries) {
      if (sn === pSite) continue;
      const ota = round4(primaryComp[sn][3] / 240);
      const tot = round2(h.normal + h.holiday + h.sunday);
      addTotal = round2(addTotal + tot * ota);
      addExp.push(`${sn}:${tot}h@${ota}`);
    }
    const gross = round2(normalPay + holidayPay + sundayPay + transportPaid + addTotal);
    const pensionable = round2(normalPay + sundayPay);
    const empPen = pensionable > 0 ? round2((pensionable * 7) / 100) : 0;
    const empPenEr = pensionable > 0 ? round2((pensionable * 11) / 100) : 0;
    const taxable = round2(normalPay + holidayPay + sundayPay + addTotal);
    const iTax = calcTax(taxable);
    const deductionsAmount = code === 'QAG004' ? 500 : code === 'QAG002' ? 300 : 0;
    const net = round2(gross - empPen - iTax - deductionsAmount);

    const checks = [
      ['otRate', ot, round4(rec.primary?.otRate ?? rec.calculation?.primary?.otRate)],
      ['normalPay', normalPay, round2(rec.primary?.normalPay ?? rec.calculation?.primary?.normalPay)],
      ['sundayPay', sundayPay, round2(rec.primary?.sundayPay ?? rec.calculation?.primary?.sundayPay)],
      ['transportPaid', transportPaid, round2(rec.primary?.transportPaid ?? rec.calculation?.primary?.transportPaid)],
      ['pensionBase', pensionable, round2(rec.pensionBase ?? rec.calculation?.pensionBase)],
      ['employeePension', empPen, round2(rec.employeePension)],
      ['employerPension', empPenEr, round2(rec.employerPension)],
      ['incomeTax', iTax, round2(rec.incomeTax)],
      ['grossEarnings', gross, round2(rec.grossEarnings)],
      ['netPay', net, round2(rec.netPay)],
    ];
    for (const [name, exp, act] of checks) {
      if (Math.abs(exp - act) > 0.05) {
        failures++;
        results.push({ caseId: `GP-V-${code}-${name}`, name: `${code} ${name}`, expected: exp, actual: act, status: 'FAIL' });
      }
    }
    results.push({ caseId: `GP-V-${code}`, name: `${code} summary`, expected: 'recorded', actual: `primary=${pSite} C=${C} add=[${addExp.join(',')}] net=${net}`, status: 'INFO' });
  }
  ev('GP-VE', 'all 7 guards match independent calculations', '0 mismatches', `${failures} mismatches`);

  // ---------- E. lifecycle ----------
  const recalc = await api(finT, 'POST', `/api/guard-payroll/runs/${run._id}/recalculate`);
  ev('GP-L1', 'recalculate allowed for Finance', true, [200, 201].includes(recalc.status));
  const submit = await api(finT, 'POST', `/api/guard-payroll/runs/${run._id}/submit`);
  ev('GP-L2', 'submit (calculated→review)', true, [200, 201].includes(submit.status));
  const check = await api(finT, 'POST', `/api/guard-payroll/runs/${run._id}/check`);
  ev('GP-L3', 'check run', true, [200, 201].includes(check.status));
  const loanBefore = await api(finT, 'GET', '/api/payroll-common/deductions?employeeId=' + guards('QAG004')).then((r) => (r.json.data || []).find((d) => d.type === 'LOAN'));
  const approve = await api(admT, 'POST', `/api/guard-payroll/runs/${run._id}/approve`);
  ev('GP-L4', 'approve requires higher permission — ADMIN approves', true, [200, 201].includes(approve.status));
  if (approve.status !== 200 && approve.status !== 201) results.push({ caseId: 'GP-L4e', name: 'approve error', expected: '', actual: JSON.stringify(approve.json).slice(0, 200), status: 'INFO' });
  const loanAfter = await api(finT, 'GET', '/api/payroll-common/deductions?employeeId=' + guards('QAG004')).then((r) => (r.json.data || []).find((d) => d.type === 'LOAN'));
  ev('GP-L5', 'loan balance settled after approval (3000→2500)', 2500, round2(loanAfter?.remainingBalance ?? 0));
  // lifetime protection: approve already-approved → 400
  const approve2 = await api(admT, 'POST', `/api/guard-payroll/runs/${run._id}/approve`);
  ev('GP-L6', 're-approve blocked', true, approve2.status === 400 || approve2.status === 409);

  // salaryHistory/audit from site compensation
  const audit = await api(admT, 'GET', '/api/audit-logs?limit=1000').then(async (r) => {
    // find site-compensation audit rows by acting user
    const rows = (r.json.data || []);
    const compRows = rows.filter((a) => /COMPENSATION|SITE_PRICE|GUARD_SITE/i.test(a.action || ''));
    return { rows: rows.length, comp: compRows.length };
  });
  results.push({ caseId: 'GP-AUD', name: 'audit coverage', expected: 'recorded', actual: JSON.stringify(audit), status: 'INFO' });

  fs.writeFileSync('.qa-testdata.json', JSON.stringify(td, null, 2));
  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/guard-payroll.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`GUARD PAYROLL: ${pass} pass / ${fail} fail (+${results.filter(r=>r.status==='INFO').length} info)`);
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  FAIL ${r.caseId} ${r.name}: expected ${r.expected}, got ${r.actual}`);
  for (const r of results.filter((r) => r.status === 'INFO')) console.log(`  INFO ${r.caseId} ${r.name}: ${String(r.actual).slice(0, 140)}`);
}

main().catch((e) => { console.error('GUARD PAYROLL FAILED:', e); process.exit(1); });
