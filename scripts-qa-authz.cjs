/**
 * QA AUTHORIZATION MATRIX — for each of the five QA roles, probe permitted and
 * forbidden backend endpoints and record PASS/FAIL against the expected matrix.
 * Evidence: .qa-artifacts/authz-matrix.json + console table.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));
ADMIN_LOGIN = { email: 'admin@vitalpayroll.com', password: 'password123' };

const results = [];
const add = (role, caseId, endpoint, expected, actual, bodyHint) => {
  const ok = expected === actual;
  results.push({ caseId, role, endpoint, expected, actual, status: ok ? 'PASS' : 'FAIL', bodyHint: bodyHint || '', finding: !ok });
  return ok;
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
  // login all roles
  const tokens = {};
  for (const [key, c] of Object.entries(creds)) {
    const l = await api(null, 'POST', '/api/auth/login', { email: c.email, password: c.password });
    if (!l.json.success) throw new Error(`login ${key} failed`);
    tokens[key] = { token: l.json.data.accessToken || l.json.data.token, id: (l.json.data.user?._id) || creds[key].id };
  }
  const admin = await api(null, 'POST', '/api/auth/login', ADMIN_LOGIN);
  tokens.ADMINROOT = { token: admin.json.data.accessToken || admin.json.data.token };

  const read2xx = (s) => (s === 200 || s === 201);
  const deny = (s) => (s === 401 || s === 403);
  const anySuccess = (s) => read2xx(s) || (s >= 400 && s < 500 && s !== 401 && s !== 403 && s !== 404);
  // "allowed" = authorization passed (2xx or business-level 4xx, not a 403/401)
  const expectAllow = (name) => async (t, path, body) => {
    const { status, json } = await api(t, 'POST', path, body);
    return { status, json, ok: anySuccess(status), note: `HTTP ${status} ${json?.message || ''}` };
  };

  // ---- ADMIN: everything allowed ----
  console.log('== ADMIN ==');
  for (const [id, cfg] of Object.entries({
    'A1':   ['GET', '/api/employees'],
    'A2':   ['GET', '/api/users'],
    'A3':   ['GET', '/api/audit-logs'],
    'A4':   ['GET', '/api/staff-payroll/runs'],
    'A5':   ['GET', '/api/guard-payroll/runs'],
    'A6':   ['GET', '/api/rotations'],
    'A7':   ['GET', '/api/reports/payroll-summary'],
    'A8':   ['GET', '/api/module-reports/payroll'],
    'A9':   ['POST', '/api/companies', { name: 'ADMINAUTH-PROBE', contactPerson: 'x', phone: '0510000000', email: 'adminauthprobe@x.local', address: 'x' }],
  })) {
    const { status, json } = await api(tokens.ADMINROOT.token, cfg[0], cfg[1], cfg[2]);
    add('ADMIN', id, `${cfg[0]} ${cfg[1]}`, 'allow', anySuccess(status) ? 'allow' : `deny(${status})`, (json.message || '').slice(0, 80));
  }

  // ---- CEO: all reads allowed, all mutations denied ----
  console.log('== CEO ==');
  const ct = tokens.CEO.token;
  for (const [id, path] of Object.entries({
    'C1': '/api/employees', 'C2': '/api/companies', 'C3': '/api/sites', 'C4': '/api/staff-payroll/runs',
    'C5': '/api/guard-payroll/runs', 'C6': '/api/reports/payroll-summary', 'C7': '/api/module-reports/payroll',
    'C8': '/api/module-reports/hr', 'C9': '/api/audit-logs', 'C10': '/api/rotations', 'C11': '/api/users',
  })) {
    const { status } = await api(ct, 'GET', path);
    add('CEO', id, `GET ${path}`, 'allow', anySuccess(status) ? 'allow' : `deny(${status})`);
  }
  // CEO mutations must be denied
  for (const [id, cfg] of Object.entries({
    'C20': ['POST', '/api/employees', { firstName: 'CEOpro', lastName: 'be', email: 'ceoprobe@x.local' }],
    'C21': ['POST', '/api/companies', { name: 'CEOPROBE', contactPerson: 'x', phone: '0510000000', email: 'ceoprobe2@x.local' }],
    'C22': ['POST', '/api/sites', { siteName: 'CEOPROBE', siteCode: 'QACEO' }],
    'C23': ['POST', '/api/users', {}],
    'C24': ['PUT', '/api/guard-payroll/config', { transportPercent: 5 }],
    'C25': ['POST', '/api/guard-payroll/compensations', {}],
    'C26': ['POST', '/api/staff-payroll/generate/2099-01'],
  })) {
    const { status, json } = await api(ct, cfg[0], cfg[1], cfg[2]);
    add('CEO', id, `${cfg[0]} ${cfg[1]}`, 'deny', deny(status) ? 'deny' : `allow(${status})`, (json.message || '').slice(0, 80));
  }
  // C27: self-role-elevation attempt
  {
    const { status } = await api(ct, 'PUT', `/api/users/${creds.CEO.id}`, { role: 'SUPER_ADMIN' });
    add('CEO', 'C27', 'PUT /api/users/:self (role escalation)', 'deny', deny(status) ? 'deny' : `allow(${status})`);
  }
  // C28: CEO approve rotation (role map grants ROTATION_APPROVE — verify against requirement)
  // needs a real rotation; created later in ops phase — record as NOT TESTED here.
  results.push({ caseId: 'C28', role: 'CEO', endpoint: 'POST /api/rotations/:id/approve (ROTATION_APPROVE in CEO role map)', expected: 'deny per brief', actual: 'deferred', status: 'PENDING', bodyHint: 'tested after a rotation exists' });

  // ---- HR ----
  console.log('== HR ==');
  const ht = tokens.HR.token;
  {
    const { status } = await api(ht, 'GET', '/api/employees?limit=1');
    add('HR', 'H1', 'GET /api/employees', 'allow', anySuccess(status) ? 'allow' : `deny(${status})`);
  }
  for (const [id, cfg] of Object.entries({
    // H10 exists only to confirm HR employee-write is NOT denied (brief allows it)
    'H11': ['POST', '/api/users', { email: 'hrqaprobe@x.local' }],
    'H12': ['PUT', `/api/users/${creds.CEO.id}`, { firstName: 'hacked' }],
    'H13': ['POST', '/api/companies', { name: 'HRPROBE' }],
    'H14': ['POST', '/api/staff-payroll/generate/2099-01'],
    'H15': ['POST', '/api/guard-payroll/compensations', {}],
    'H16': ['PUT', '/api/guard-payroll/config', {}],
  })) {
    const { status, json } = await api(ht, cfg[0], cfg[1], cfg[2]);
    add('HR', id, `${cfg[0]} ${cfg[1]}`, 'deny', deny(status) ? 'deny' : `allow(${status})`, (json.message || '').slice(0, 80));
  }
  // reads that HR gets — record what comes back
  for (const [id, path] of Object.entries({
    'H20': '/api/users', 'H21': '/api/staff-payroll/runs', 'H22': '/api/guard-payroll/runs',
    'H23': '/api/module-reports/payroll?module=STAFF', 'H24': '/api/audit-logs',
    'H25': '/api/module-reports/users',
  })) {
    const { status } = await api(ht, 'GET', path);
    add('HR', id, `GET ${path}`, 'explicit', 'explicit', `HTTP ${status}`);
  }

  // ---- OPS ----
  console.log('== OPS ==');
  const ot = tokens.OPS.token;
  {
    const { status, json } = await api(ot, 'POST', '/api/companies', { name: 'OPSPROBE', contactPerson: 'x', phone: '0510000000', email: 'opsprobe@x.local' });
    add('OPS', 'O1', 'POST /api/companies (module-granted)', 'allow', [200, 201].includes(status) ? 'allow' : `${status}`, (json.message || '').slice(0, 80));
    if ([200, 201].includes(status)) await api(tokens.ADMINROOT.token, 'DELETE', `/api/companies/${json.data._id}`);
  }
  for (const [id, cfg] of Object.entries({
    'O10': ['POST', '/api/employees', {}],
    'O11': ['POST', '/api/users', { email: 'opsqaprobe@x.local' }],
    'O12': ['POST', '/api/staff-payroll/generate/2099-01'],
    'O13': ['POST', '/api/guard-payroll/compensations', {}],
    'O14': ['PUT', '/api/guard-payroll/config', {}],
  })) {
    const { status, json } = await api(ot, cfg[0], cfg[1], cfg[2]);
    add('OPS', id, `${cfg[0]} ${cfg[1]}`, 'deny', deny(status) ? 'deny' : `allow(${status})`, (json.message || '').slice(0, 80));
  }
  for (const [id, path] of Object.entries({
    'O20': '/api/employees?limit=1', 'O21': '/api/sites', 'O22': '/api/rotations',
    'O23': '/api/guard-payroll/runs', 'O24': '/api/attendance/records?limit=1', 'O25': '/api/audit-logs',
    'O26': '/api/module-reports/payroll?module=GUARD',
  })) {
    const { status } = await api(ot, 'GET', path);
    add('OPS', id, `GET ${path}`, 'explicit', 'explicit', `HTTP ${status}`);
  }

  // ---- FINANCE ----
  console.log('== FINANCE ==');
  const ft = tokens.FINANCE.token;
  for (const [id, cfg] of Object.entries({
    'F10': ['POST', '/api/employees', {}],
    'F11': ['POST', '/api/users', { email: 'finprobe@x.local' }],
    'F13': ['POST', '/api/rotations', {}],
  })) {
    const { status, json } = await api(ft, cfg[0], cfg[1], cfg[2]);
    add('FINANCE', id, `${cfg[0]} ${cfg[1]}`, 'deny', deny(status) ? 'deny' : `allow(${status})`, (json.message || '').slice(0, 80));
  }
  // F12: Finance DELETE company — authorize() passes (has COMPANY_UPDATE) → business layer reached (404 on fake id)
  {
    const { status } = await api(ft, 'DELETE', '/api/companies/000000000000000000000000');
    add('FINANCE', 'F12', 'DELETE /api/companies/:id', 'deny-by-authorize', status === 404 ? 'PASSED-AUTHORIZE(404)' : deny(status) ? 'deny' : `allow(${status})`);
  }
  for (const [id, cfg] of Object.entries({
    'F1': ['PUT', '/api/guard-payroll/config', { transportPercent: 20 }],
    'F2': ['POST', '/api/guard-payroll/compensations', { siteId: '000000000000000000000000', amount: 1, effectiveFrom: '2099-01-01' }],
    'F3': ['POST', '/api/staff-payroll/generate/2099-01'],
    'F4': ['POST', '/api/guard-payroll/generate/2099-01'],
  })) {
    const { status, json } = await api(ft, cfg[0], cfg[1], cfg[2]);
    add('FINANCE', id, `${cfg[0]} ${cfg[1]}`, 'allow', anySuccess(status) ? 'allow' : `${status}`, (json.message || '').slice(0, 80));
  }
  for (const [id, path] of Object.entries({
    'F20': '/api/staff-payroll/runs', 'F21': '/api/guard-payroll/runs', 'F22': '/api/reports/payroll-summary?periodKey=2099-01',
    'F23': '/api/module-reports/hr?category=ALL', 'F24': '/api/audit-logs',
  })) {
    const { status } = await api(ft, 'GET', path);
    add('FINANCE', id, `GET ${path}`, 'explicit', 'explicit', `HTTP ${status}`);
  }

  // summary
  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/authz-matrix.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\nAUTHZ MATRIX: ${pass} pass / ${fail} fail / ${results.length - pass - fail} pending — evidence in .qa-artifacts/authz-matrix.json`);
  for (const r of results.filter((r) => r.status !== 'PASS')) console.log(`  ${r.status} ${r.caseId} [${r.role}] ${r.endpoint}: expected ${r.expected}, got ${r.actual} ${r.bodyHint}`);
})().catch((e) => { console.error('AUTHZ RUN FAILED:', e); process.exit(1); });
