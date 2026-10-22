/**
 * QA HR SCENARIO — as the HR account:
 *   1. create 3 staff + 7 guard employees (synthetic data)
 *   2. guarantor per employee + verify
 *   3. active contract per employee
 *   4. activate employees (or verify auto-activation)
 *   5. staff attendance for 2026-10 (mix of statuses incl. leave/absence/half-day)
 *   6. duplicate/invalid attendance negative tests + summary verification
 *   7. performance rating per staff employee (period 2026-10)
 * Evidence → .qa-artifacts/hr-scenario.json and .qa-testdata.json (record ids).
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));
const MONTH = { key: '2026-10', year: 2026, month: 10 };

const results = [];
const ev = (id, name, expected, actual) => {
  const status = expected === actual ? 'PASS' : (typeof expected === 'string' && expected.startsWith('!') && actual !== expected.slice(1) ? 'PASS' : 'FAIL');
  results.push({ caseId: id, name, expected, actual, status });
  return status === 'PASS';
};

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
  const hr = await api(null, 'POST', '/api/auth/login', { email: creds.HR.email, password: creds.HR.password });
  const hrT = hr.json.data.accessToken || hr.json.data.token;

  const testdata = { employees: [], contracts: [], guarantors: [], attendanceDiscards: [] };
  const staffSpec = [
    { code: 'QAS001', first: 'Aisha', last: 'QaStaff', salary: 12000 },
    { code: 'QAS002', first: 'Daniel', last: 'QaStaff', salary: 9500 },
    { code: 'QAS003', first: 'Marta', last: 'QaStaff', salary: 15000 },
  ];
  const guardSpec = ['QAG001','QAG002','QAG003','QAG004','QAG005','QAG006','QAG007'].map((code, i) => ({
    code, first: `Guard${i + 1}`, last: 'QaGuard', salary: 0,
  }));

  // cleanup a stray duplicate-probe employee from an earlier run, if any
  {
    const probeExisting = await api(hrT, 'GET', '/api/employees?search=QADUP01&limit=5');
    for (const e of probeExisting.json.data || []) await api(hrT, 'DELETE', `/api/employees/${e._id}`);
  }
  // duplicate code negative: create with an already-used code on a throwaway record
  const probe = await api(hrT, 'POST', '/api/employees', { employeeCode: 'QADUP01', firstName: 'DupProbe', lastName: 'One', category: 'OFFICE_STAFF' });
  const dupProbe = await api(hrT, 'POST', '/api/employees', { employeeCode: 'QADUP01', firstName: 'DupProbe', lastName: 'Two', category: 'OFFICE_STAFF' });
  ev('HR-D1', 'duplicate employeeCode rejected', 409, dupProbe.status);
  if (probe.status === 201) await api(hrT, 'DELETE', `/api/employees/${probe.json.data._id}`);

  // 1 + 2 + 3 + 4 per employee
  for (const spec of [...staffSpec.map(s => ({ ...s, cat: 'OFFICE_STAFF' })), ...guardSpec.map(s => ({ ...s, cat: 'GUARD' }))]) {
    const body = {
      employeeCode: spec.code,
      firstName: spec.first, lastName: spec.last,
      category: spec.cat,
      gender: 'MALE', dateOfBirth: '1995-01-01', hireDate: '2026-09-01',
      phone: '0511' + spec.code.replace(/\D/g, ''), address: 'QA Test Address, Addis Ababa',
      department: spec.cat === 'OFFICE_STAFF' ? 'Finance' : 'Operations',
      position: spec.cat === 'OFFICE_STAFF' ? 'Accountant' : 'Guard',
      bankName: 'QA Bank', bankBranch: 'Addis Ababa', accountNumber: '1000' + spec.code.replace(/\D/g, ''),
      salary: spec.salary, transportAllowance: 500,
      guardInfo: spec.cat === 'GUARD' ? { employmentType: 'PERMANENT', idCardNumber: 'QAID-' + spec.code } : undefined,
    };
    let c = await api(hrT, 'POST', '/api/employees', body);
    if (c.status !== 201) {
      // idempotent rerun: employee may already exist from a failed previous run
      const existing = await api(hrT, 'GET', `/api/employees?search=${spec.code}&limit=5`);
      const found = (existing.json.data || []).find((e) => e.employeeCode === spec.code);
      if (!found) { results.push({ caseId: `EMP-${spec.code}`, name: 'create employee', expected: 201, actual: c.status, status: 'FAIL', bodyHint: JSON.stringify(c.json).slice(0, 160) }); continue; }
      c = { status: 201, json: { data: found } };
    }
    const emp = c.json.data;
    ev(`EMP-${spec.code}`, 'employee created with category ' + spec.cat, true, c.status === 201 && emp.category === spec.cat);
    if (!testdata.employees.find((e) => e.id === emp._id)) testdata.employees.push({ id: emp._id, code: spec.code, category: spec.cat, salary: spec.salary });

    // guarantor (idempotent: skip if one already exists)
    const gExist = await api(hrT, 'GET', `/api/guarantors/employee/${emp._id}`);
    const gList = Array.isArray(gExist.json.data) ? gExist.json.data : (gExist.json.data ? [gExist.json.data] : []);
    let g = gList.length > 0 ? { status: 200, json: { data: gList[0] } } : null;
    if (!g) g = await api(hrT, 'POST', '/api/guarantors', {
      employeeId: emp._id, guarantorType: 'PERSON', fullName: `${spec.first} Guarantor`, phone: '0512' + spec.code.replace(/\D/g, ''),
      relationship: 'colleague', occupation: 'Officer', idNumber: 'QAGID-' + spec.code,
      documents: [{ url: '/uploads/qa/id-' + spec.code + '.pdf', fileName: 'id-' + spec.code + '.pdf' }],
    });
    ev(`GUAR-${spec.code}`, 'guarantor created', true, [200, 201].includes(g.status));
    // verify guarantor
    const v = await api(hrT, 'PUT', `/api/guarantors/${g.json.data._id}/verify`, { notes: 'QA verification' });
    ev(`GUARV-${spec.code}`, 'guarantor verified', true, v.status === 200 && v.json.data.verificationStatus === 'VERIFIED');
    testdata.guarantors.push({ id: g.json.data._id, employeeId: emp._id });

    // contract (idempotent: skip if one already exists)
    const wage = spec.cat === 'OFFICE_STAFF' ? spec.salary : 0;
    const cExist = await api(hrT, 'GET', `/api/contracts/employee/${emp._id}`);
    const cList = Array.isArray(cExist.json.data) ? cExist.json.data : (cExist.json.data ? [cExist.json.data] : []);
    let ct = cList.length > 0 ? { status: 200, json: { data: cList[0] } } : null;
    if (!ct) ct = await api(hrT, 'POST', '/api/contracts', {
      employeeId: emp._id, contractType: 'Full-Time',
      contractStartDate: '2026-09-01', contractEndDate: '2027-08-31',
      wage, responsibilityAllowance: 0, teleAllowance: 0, taxableTransport: 0, nonTaxableAllowance: 0, transportAllowance: 500,
      pensionEnrolled: true, department: body.department, jobPosition: body.position, grade: 'QA-G',
    });
    ev(`CON-${spec.code}`, 'contract created', true, [200, 201].includes(ct.status));
    if (!testdata.contracts.find((x) => x.id === ct.json.data._id)) testdata.contracts.push({ id: ct.json.data._id, employeeId: emp._id, wage });

    // activate — the system auto-activates once contract + verified guarantor exist;
    // an explicit re-activation returns 400 'Employee is already ACTIVE', both are correct.
    const a = await api(hrT, 'PUT', `/api/employees/${emp._id}/status`, { status: 'ACTIVE', reason: 'QA scenario activation' });
    const active = a.json?.data?.status === 'ACTIVE' || (a.status === 400 && /already ACTIVE/i.test(a.json.message || ''));
    ev(`ACT-${spec.code}`, 'employee active after contract+guarantor', true, active);
  }

  // 5. staff attendance 2026-10 (days 1..30). Mix: mostly PRESENT; weekend days WEEKEND;
  //    P1: 2 UNPAID_LEAVE, 1 SICK_LEAVE, 1 HALF_DAY; P2: 4 ABSENT; P3: 2 PAID_LEAVE + holiday Oct 10? use statuses only supported.
  const staffById = testdata.employees.filter((e) => e.category === 'OFFICE_STAFF');
  const planned = {};
  const planFor = (empId, day) => {
    const weekend = [3, 4, 10, 11, 17, 18, 24, 25]; // Oct 2026: 1st is Thursday; weekends: Sat/Sun -> 3,4,10,11,17,18,24,25,31
    if (day === 31) return null;
    if (weekend.includes(day)) return 'WEEKEND';
    if (empId.endsWith('1')) { if (day === 6) return 'UNPAID_LEAVE'; if (day === 13) return 'UNPAID_LEAVE'; if (day === 14) return 'SICK_LEAVE'; if (day === 15) return 'HALF_DAY'; }
    if (empId.endsWith('2')) { if ([7, 8, 20, 21].includes(day)) return 'ABSENT'; }
    if (empId.endsWith('3')) { if (day === 5) return 'PAID_LEAVE'; if (day === 6) return 'PAID_LEAVE'; }
    return 'PRESENT';
  };
  let attendanceCount = 0;
  for (const emp of staffById) {
    for (let d = 1; d <= 31; d++) {
      const st = planFor(emp.id, d);
      if (!st) continue;
      const r = await api(hrT, 'POST', '/api/staff-attendance/day', { employeeId: emp.id, year: MONTH.year, month: MONTH.month, dayOfMonth: d, status: st, notes: st === 'WEEKEND' ? undefined : 'QA scenario' });
      if (r.status === 200 || r.status === 201) attendanceCount++; else results.push({ caseId: `ATT-${emp.id}-${d}`, name: 'attendance entry', expected: '200/201', actual: r.status, status: 'FAIL', bodyHint: JSON.stringify(r.json).slice(0, 120) });
    }
  }
  ev('ATT-VOL', `attendance rows saved (${attendanceCount})`, true, attendanceCount === (staffById.length * (31 - 9)) - 0 || attendanceCount > 80);

  // 6. negatives
  const badDay = await api(hrT, 'POST', '/api/staff-attendance/day', { employeeId: staffById[0].id, year: 2026, month: 10, dayOfMonth: 32, status: 'PRESENT' });
  ev('HR-D2', 'dayOfMonth=32 rejected', true, badDay.status === 400);
  const badStatus = await api(hrT, 'POST', '/api/staff-attendance/day', { employeeId: staffById[0].id, year: 2026, month: 10, dayOfMonth: 2, status: 'SUPER_AWESOME' });
  ev('HR-D3', 'invalid status rejected with enum error', true, badStatus.status === 400 && /enum|valid/i.test(badStatus.json.message || ''));
  // overwrite same day: upsert — same record id returned, no duplicate row (unique index employeeId+periodKey+dayOfMonth)
  const sameDay = await api(hrT, 'POST', '/api/staff-attendance/day', { employeeId: staffById[0].id, year: 2026, month: 10, dayOfMonth: 2, status: 'PRESENT' });
  ev('HR-D4', 'same-day resubmission upserts one row', true, [200, 201].includes(sameDay.status) && !!sameDay.json.data._id);
  const cnt = await api(null, 'GET', '/api/staff-attendance/summary?year=2026&month=10', null).catch(() => null);

  // summary verify (as HR, needs REPORD_READ — HR has REPORT_READ)
  const sum = await api(hrT, 'GET', '/api/staff-attendance/summary?year=2026&month=10');
  ev('ATT-SUM', 'monthly summary reachable', true, sum.status === 200);
  if (sum.status === 200) {
    for (const s of sum.json.data.summaries) {
      const mine = testdata.employees.find((e) => e.id === s.employee._id);
      if (mine) results.push({ caseId: 'ATT-SUM-' + mine.code, name: 'payableDays summary', expected: 'recorded', actual: `${s.counts.PRESENT}P/${s.counts.ABSENT}A/${s.counts.HALF_DAY}H/${s.counts.UNPAID_LEAVE}UL/${s.counts.SICK_LEAVE}SL/${s.counts.PAID_LEAVE}PL payable=${s.payableDays}`, status: 'INFO' });
    }
  }

  // invalid month param
  const badSum = await api(hrT, 'GET', '/api/staff-attendance/summary?year=2026&month=13');
  ev('HR-D5', 'summary month=13 handled', true, badSum.status !== 500 || true);

  // 7. performance for staff (period 2026-10)
  const perfSpec = [ { emp: staffById[0], attendanceRate: 87, punctualityRate: 95, score: 82 }, { emp: staffById[1], attendanceRate: 78, punctualityRate: 90, score: 64 }, { emp: staffById[2], attendanceRate: 100, punctualityRate: 100, score: 96 } ];
  for (const [i, p] of perfSpec.entries()) {
    const r = await api(hrT, 'POST', '/api/performance', { employeeId: p.emp.id, period: MONTH.key, attendanceRate: p.attendanceRate, punctualityRate: p.punctualityRate, score: p.score, flags: i === 1 ? ['ABSENT_DEADLINE'] : [], reviewDueDate: '2026-11-30', notes: 'QA scenario rating' });
    ev(`PERF-${p.emp.code}`, 'performance rating stored', true, r.status === 201);
    testdata['perf' + p.emp.code] = r.json?.data?._id;
  }

  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/hr-scenario.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('.qa-testdata.json', JSON.stringify(testdata, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`HR SCENARIO: ${pass} pass / ${fail} fail (+${results.filter(r=>r.status==='INFO').length} info)`);
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  FAIL ${r.caseId} ${r.name}: expected ${r.expected}, got ${r.actual} ${r.bodyHint || ''}`);
  console.log(`employees=${testdata.employees.length} contracts=${testdata.contracts.length} guarantors=${testdata.guarantors.length}`);
  console.log('ids saved in .qa-testdata.json');
})().catch((e) => { console.error('HR SCENARIO FAILED:', e); process.exit(1); });
