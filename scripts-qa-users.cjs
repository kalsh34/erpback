/**
 * QA STEP — create the five test accounts through the normal Organization
 * user-management API (POST /api/users) as admin, then verify each can log in.
 * Credentials are written to .qa-credentials.json (local only, never printed).
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const ADMIN = { email: 'admin@vitalpayroll.com', password: 'password123' };

const USERS = [
  { key: 'ADMIN',  firstName: 'System', lastName: 'Admin', role: 'SUPER_ADMIN',      moduleGrants: [] },
  { key: 'CEO',    firstName: 'QA',     lastName: 'CEO',   role: 'CEO',              moduleGrants: [] },
  { key: 'HR',     firstName: 'QA',     lastName: 'HR',    role: 'HR_ADMIN',         moduleGrants: [] },
  { key: 'OPS',    firstName: 'QA',     lastName: 'Ops',   role: 'OPERATIONS',       moduleGrants: ['company'] },
  { key: 'FINANCE',firstName: 'QA',     lastName: 'Fin',   role: 'FINANCE_OFFICER',  moduleGrants: [] },
].map((u) => ({
  ...u,
  email: `${u.key.toLowerCase()}-qa@vitaltest.local`,
  password: `QaTest-${u.key}-2026!`,
}));

const login = async (email, password) => {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  return { status: r.status, json: j };
};

(async () => {
  const admin = await login(ADMIN.email, ADMIN.password);
  if (!admin.json.success) throw new Error('Admin login failed — cannot proceed');
  const token = admin.json.data.accessToken || admin.json.data.token;

  const creds = {};
  for (const u of USERS) {
    const existing = await fetch(`${BASE}/api/users?search=${encodeURIComponent(u.email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    const found = (existing.data || []).find((x) => x.email === u.email);
    if (found) { console.log(`EXISTS  ${u.key}: ${u.email} (id ${found._id})`); creds[u.key] = { ...u, id: found._id, reused: true }; continue; }
    const r = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: u.email, password: u.password, firstName: u.firstName, lastName: u.lastName, role: u.role, moduleGrants: u.moduleGrants }),
    });
    const j = await r.json();
    if (!r.status.toString().startsWith('2')) throw new Error(`Create ${u.key} failed: HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    console.log(`CREATED ${u.key}: ${u.email} role=${u.role} grants=${JSON.stringify(u.moduleGrants)} id=${j.data._id}`);
    creds[u.key] = { ...u, id: j.data._id, reused: false };
  }

  // Verify each account can log in.
  for (const u of USERS) {
    const l = await login(u.email, u.password);
    const perms = l.json?.data?.user?.permissions;
    console.log(`LOGIN   ${u.key}: HTTP ${l.status} success=${l.json.success} role=${l.json?.data?.user?.role} perms=${Array.isArray(perms) ? perms.length : 'n/a'}`);
    if (!l.json.success) throw new Error(`Login verification failed for ${u.key}`);
  }

  fs.writeFileSync('.qa-credentials.json', JSON.stringify(creds, null, 2));
  console.log('Credentials stored in backend/.qa-credentials.json (not printed)');
})().catch((e) => { console.error('USER SETUP FAILED:', e.message); process.exit(1); });
