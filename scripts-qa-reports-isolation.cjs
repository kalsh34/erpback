/**
 * QA REPORTS ISOLATION — every role opens the module-reports endpoints; check
 * who receives what, and whether sensitive fields leak to roles that must not
 * see them. Evidence → .qa-artifacts/reports-isolation.json
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));

const results = [];
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

(async () => {
  const T = {};
  for (const [k, c] of Object.entries(creds)) T[k] = getToken(await api(null, 'POST', '/api/auth/login', { email: c.email, password: c.password }));
  T.GUARD = getToken(await api(null, 'POST', '/api/auth/login', { email: 'guard@vitalpayroll.com', password: 'password123' }));

  const endpoints = {
    hr: '/api/module-reports/hr', sites: '/api/module-reports/sites', guards: '/api/module-reports/guards',
    guardAttendance: '/api/module-reports/guard-attendance', staffAttendance: '/api/module-reports/staff-attendance',
    payrollGuard: '/api/module-reports/payroll?module=GUARD', payrollStaff: '/api/module-reports/payroll?module=STAFF',
    audit: '/api/module-reports/audit', users: '/api/module-reports/users',
    payrollSummary: '/api/reports/payroll-summary', siteLabor: '/api/reports/site-labor-cost', payHist: '/api/reports/payment-history',
  };
  // expectation: which roles should be able to open it (200)
  const matrix = {
    hr: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    sites: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    guards: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    guardAttendance: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    staffAttendance: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    payrollGuard: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    payrollStaff: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    audit: ['ADMIN', 'CEO', 'FINANCE'],
    users: ['ADMIN', 'CEO', 'HR', 'FINANCE'],
    payrollSummary: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    siteLabor: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
    payHist: ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE'],
  };
  const rolesToTest = ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE', 'GUARD'];

  for (const [ep, allowed] of Object.entries(matrix)) {
    for (const role of rolesToTest) {
      const r = await api(T[role], 'GET', endpoints[ep]);
      const got = r.status === 200;
      const want = allowed.includes(role);
      results.push({
        caseId: `RPT-${ep}-${role}`, endpoint: endpoints[ep], role,
        expected: want ? '200' : '401/403',
        actual: String(r.status),
        status: (want && got) || (!want && (r.status === 401 || r.status === 403)) ? 'PASS' : 'FINDING',
      });
    }
  }

  // What does the payroll report expose to each role? (name + net pay presence)
  for (const role of ['ADMIN', 'CEO', 'HR', 'OPS', 'FINANCE']) {
    const r = await api(T[role], 'GET', endpoints.payrollGuard);
    const d = r.json?.data;
    const summary = d?.summary || null;
    const rows = d?.rows || d || [];
    const hasSalary = Array.isArray(rows) && rows.some((x) => JSON.stringify(x).includes('netPay') || JSON.stringify(x).includes('net'));
    results.push({ caseId: `RPTDATA-guardpayroll-${role}`, endpoint: endpoints.payrollGuard, role, expected: 'recorded', actual: `rows=${Array.isArray(rows) ? rows.length : '?'} exposure=${summary ? 'summary+rows' : 'rows'} hasSalaryField=${hasSalary}`, status: 'INFO' });
  }

  // Guard self-service: GUARD must NOT read the aggregate payroll report
  const g = await api(T.GUARD, 'GET', endpoints.payrollGuard);
  results.push({ caseId: 'RPT-guard-agg', endpoint: endpoints.payrollGuard, role: 'GUARD', expected: 'deny', actual: String(g.status), status: [401, 403].includes(g.status) ? 'PASS' : 'FINDING' });
  results.push({ caseId: 'RPT-guard-my', endpoint: '/api/guard-payroll/my', role: 'GUARD', expected: 'recorded', actual: JSON.stringify((await api(T.GUARD, 'GET', '/api/guard-payroll/my')).json).slice(0, 160), status: 'INFO' });

  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/reports-isolation.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, find = results.filter((r) => r.status === 'FINDING').length;
  console.log(`REPORTS ISOLATION: ${pass} pass / ${find} findings (+${results.filter(r=>r.status==='INFO').length} info)`);
  for (const r of results.filter((r) => r.status === 'FINDING')) console.log(`  FINDING ${r.caseId}: expected ${r.expected}, got ${r.actual}`);
  for (const r of results.filter((r) => r.status === 'INFO')) console.log(`  INFO ${r.caseId}: ${String(r.actual).slice(0, 180)}`);
})().catch((e) => { console.error('REPORTS ISOLATION FAILED:', e); process.exit(1); });
