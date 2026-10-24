/**
 * QA ROTATIONS STEP 2 — approve/publish lifecycle; CEO approve-permission probe (C28).
 * Evidence → .qa-artifacts/rotations-step2.json + authz matrix update.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));

const results = [];
const ev = (id, name, expected, actual, note) => {
  results.push({ caseId: id, name, expected, actual, status: expected ? (expected === actual || note ? 'PASS' : 'FAIL') : 'INFO', note: note || '' });
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
  const td = JSON.parse(fs.readFileSync('.qa-testdata.json', 'utf8'));

  const lA = await api(null, 'POST', '/api/auth/login', ADMIN_LOGIN = { email: 'admin@vitalpayroll.com', password: 'password123' });
  const adminT = lA.json.data.accessToken || lA.json.data.token;
  const ev2 = (id, name, expected, actual) => results.push({ caseId: id, name, expected, actual, status: String(actual).includes(String(expected)) ? 'PASS' : 'FAIL' });

  // ADMIN lifecycle on rotation 1 (A1)
  const rot1 = td.rotations[0].id;
  const app1 = await api(adminT, 'POST', `/api/rotations/${rot1}/approve`, {});
  ev2('ROT-APP1', 'ADMIN approves generated rotation', '200', app1.status);
  const pub1 = await api(adminT, 'POST', `/api/rotations/${rot1}/publish`, {});
  ev2('ROT-PUB1', 'ADMIN publishes approved rotation', '200', pub1.status);
  if (pub1.status !== 200) results.push({ caseId: 'ROT-PUB1e', name: 'publish error', expected: '', actual: JSON.stringify(pub1.j || pub1.json).slice(0, 200), status: 'INFO' });
  const glide1 = await api(adminT, 'GET', `/api/rotations/${rot1}`);
  results.push({ caseId: 'ROT-ST', name: 'rotation status after publish', expected: 'recorded', actual: String(glide1.json?.data?.status), status: 'INFO' });

  // leave 2 DISPOSED-safe SHIFTS? Published shift assignments feed the shifts page with rotation-sourced rows.
  const revokedTry = await api(adminT, 'POST', `/api/rotations/${td.rotations[1].id}/publish`, {});
  ev2('ROT-PUB2', 'publish before approve rejected', '400', revokedTry.status);

  // C28: CEO has ROTATION_APPROVE in the role map — approve rotation 3 as CEO
  const lC = await api(null, 'POST', '/api/auth/login', creds.CEO.password ? { email: creds.CEO.email, password: creds.CEO.password } : null);
  const ceoT = lC.json.data.accessToken || lC.json.data.token;
  const ceoApp = await api(ceoT, 'POST', `/api/rotations/${td.rotations[2].id}/approve`, {});
  results.push({
    caseId: 'C28', role: 'CEO', endpoint: 'POST /api/rotations/:id/approve',
    expected: 'deny per brief (CEO must not mutate)', actual: `HTTP ${ceoApp.status}`,
    status: ceoApp.status === 403 ? 'PASS' : 'FINDING', note: 'CEO role map grants ROTATION_APPROVE',
  });
  // CEO cannot publish (no ROTATION_PUBLISH)
  const ceoPub = await api(ceoT, 'POST', `/api/rotations/${td.rotations[2].id}/publish`, {});
  results.push({
    caseId: 'C29', role: 'CEO', endpoint: 'POST /api/rotations/:id/publish',
    expected: 'deny', actual: `HTTP ${ceoPub.status}`,
    status: ceoPub.status === 403 ? 'PASS' : 'FINDING',
  });

  fs.mkdirSync('.qa-artifacts', { recursive: true });
  // merge into authz matrix evidence
  const matrixPath = '.qa-artifacts/authz-matrix.json';
  if (fs.existsSync(matrixPath)) {
    const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    for (const r of results.filter((x) => ['C28', 'C29'].includes(x.caseId))) {
      const i = matrix.findIndex((m) => m.caseId === r.caseId);
      if (i >= 0) matrix[i] = r; else matrix.push(r);
    }
    fs.writeFileSync(matrixPath, JSON.stringify(matrix, null, 2));
  }
  fs.writeFileSync('.qa-artifacts/rotations-step2.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`ROTATIONS STEP2: ${pass} pass / ${fail} fail (+${results.filter(r => r.status === 'INFO').length} info, findings recorded for C28/C29)`);
})().catch((e) => { console.error('ROTATIONS STEP2 FAILED:', e); process.exit(1); });
