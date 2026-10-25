/**
 * SERVICE LIBRARY REGRESSION SUITE (Marketing Phase A)
 *
 * Exercises the REAL HTTP surface of /api/marketing/service-library against an
 * ephemeral in-memory database name on the configured MongoDB (never touches
 * payroll or other collections; everything created here is deleted at the end).
 *
 * Covered:
 *   - authentication (401 without a token)
 *   - authorization    (403 for roles lacking SERVICE_READ/SERVICE_MANAGE)
 *   - validation       (400 on missing fields, bad prices, bad codes, dup detail keys)
 *   - duplicate codes  (409 active; 409 when an inactive entry holds the code)
 *   - CRUD             (create → list → get → update guard figures → mirror rows)
 *   - deactivation     (soft delete; re-activation; deactivated entries read-only)
 *   - audit            (AuditLog rows for every mutation)
 *   - RBAC invariants  (CEO with a 'marketing' module grant still can't write —
 *                       mandatory denies; HR can read via the grant)
 *
 * Run: npx ts-node --transpile-only tests/serviceLibrary.check.ts
 * Requires MongoDB at config.mongoUri.
 */
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app';
import { config } from '../src/config/env';
import { User } from '../src/models/User';
import { AuditLog } from '../src/models/AuditLog';
import { ServiceLibraryItem } from '../src/models/ServiceLibraryItem';
import { computeEffectivePermissions } from '../src/middleware/rbac';
import { PERMISSIONS } from '../src/types';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`OK: ${msg}`); }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

const DB_NAME = `serviceLibrary_check_${Date.now()}`;
const SUFFIX = `${Date.now()}`.slice(-8);
const PWD = 'ServiceLibrary-Check-2026!';

async function main() {
  // Build an ephemeral DB on the same MongoDB host as config.mongoUri,
  // stripping any existing database path (e.g. /vitalpayroll) and reusing
  // query options (authSource, replicaSet, ...) untouched.
  const [prefix, after] = config.mongoUri.replace(/\/$/, '').split('://') as [string, string];
  const [hostAndPath, query] = after.split('?') as [string, string | undefined];
  const host = hostAndPath.split('/')[0];
  const q = query ? `?${query}` : '';
  const uri = `${prefix}://${host}/${DB_NAME}${q}`;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`Ephemeral DB: ${DB_NAME}`);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  // ── test accounts ──────────────────────────────────────────────────
  const hash = await bcrypt.hash(PWD, 10);
  const make = (email: string, role: string) => User.create({ email, password: hash, firstName: role, lastName: 'Test', role, isActive: true });
  const admin = await make(`svc-admin-${SUFFIX}@vital-test.invalid`, 'SUPER_ADMIN');
  const hr = await make(`svc-hr-${SUFFIX}@vital-test.invalid`, 'HR_ADMIN');
  const ceo = await make(`svc-ceo-${SUFFIX}@vital-test.invalid`, 'CEO');
  const guard = await make(`svc-guard-${SUFFIX}@vital-test.invalid`, 'GUARD');

  // RBAC invariant checks on the effective-permission model itself
  ok(computeEffectivePermissions({ role: 'SUPER_ADMIN' } as any).includes(PERMISSIONS.SERVICE_READ),
    'SUPER_ADMIN role default contains SERVICE_READ');
  ok(!computeEffectivePermissions({ role: 'HR_ADMIN' } as any).includes(PERMISSIONS.SERVICE_READ),
    'HR_ADMIN role default does NOT contain SERVICE_READ (needs a module grant)');
  const ceoWithGrant = computeEffectivePermissions({ role: 'CEO', moduleGrants: ['marketing'] } as any);
  ok(ceoWithGrant.includes(PERMISSIONS.SERVICE_READ), 'CEO + marketing grant gains SERVICE_READ');
  ok(!ceoWithGrant.includes(PERMISSIONS.SERVICE_MANAGE),
    'CEO + marketing grant still LACKS SERVICE_MANAGE (mandatory deny wins over grant)');
  const guardDefault = computeEffectivePermissions({ role: 'GUARD' } as any);
  ok(!guardDefault.includes(PERMISSIONS.SERVICE_READ) && !guardDefault.includes(PERMISSIONS.SERVICE_MANAGE),
    'GUARD role defaults contain no service permissions (grant is admin-explicit)');

  // ── real HTTP server ───────────────────────────────────────────────
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const l = app.listen(0, '127.0.0.1', () => resolve(l));
    l.on('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;

  async function login(email: string): Promise<string> {
    const res = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PWD }),
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json() as any;
    assert.equal(res.status, 200, `login ${email}`);
    return json.data.token;
  }
  const adminToken = await login(admin.email);
  const hrToken = await login(hr.email);
  const ceoToken = await login(ceo.email);
  const guardToken = await login(guard.email);

  async function req(token: string | null, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
    const url = path.startsWith('http') ? path : `${origin}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
  }

  const LIB = `${origin}/api/marketing/service-library`;

  // ── 1. authentication & authorization ──────────────────────────────
  let r = await req(null, 'GET', '/api/marketing/service-library');
  ok(r.status === 401, `no token GET → 401 (got ${r.status})`);

  r = await req(guardToken, 'GET', '/api/marketing/service-library');
  ok(r.status === 403, `GUARD without grant GET → 403 (got ${r.status})`);

  r = await req(hrToken, 'POST', '/api/marketing/service-library', { name: 'X', code: `SVC-X-${SUFFIX}`, category: 'CCTV' });
  ok(r.status === 403, `HR without grant POST → 403 (got ${r.status})`);

  r = await req(ceoToken, 'GET', '/api/marketing/service-library');
  ok(r.status === 403, `CEO without grant GET → 403 (got ${r.status})`);

  // ── 2. authorization for writes + validation (400/403, nothing persisted) ──
  // First prove SUPER_ADMIN cannot WRITE without the explicit marketing grant
  // (role map grants SERVICE_READ only, by design — no new role was created).
  r = await req(adminToken, 'POST', LIB, {
    code: `SVC-GUARD-${SUFFIX}`,
    name: 'Security Guard Service — Male & Female',
    description: 'Uniformed security guard service, per the standard shift pattern.',
    category: 'GUARD_SERVICE',
    unit: 'MONTH',
    pricingModel: 'MONTHLY_PER_GUARD',
    maleGuardsPerDay: 3,
    femaleGuardsPerDay: 2,
    maleGuardsPerMonth: 9,
    femaleGuardsPerMonth: 2,
    monthlySalaryBeforeVatMale: 12000,
    monthlySalaryBeforeVatFemale: 12000,
    shiftNote: 'Post shift 06:00–06:00 (24h on / 48h rest, per Ethiopian labor law). 3 male/day with 2 replacements = 9/month; 2 female split the late-night hours (Tiga Hotel reference).',
    structuredDetails: [{ key: 'responseTime', label: 'Response Time', value: '15 minutes' }],
  });
  ok(r.status === 403, `SUPER_ADMIN without write grant POST → 403 (got ${r.status})`);
  ok(await ServiceLibraryItem.countDocuments({}) === 0, 'no entry persisted behind the 403');

  // Then grant admin the marketing bundle (whole-module grant, admin-explicit).
  await User.updateOne({ _id: admin._id }, { $set: { moduleGrants: ['marketing'] } });
  const admin2 = await User.findById(admin._id).lean();
  const adminPerms = computeEffectivePermissions(admin2 as any);
  r = await req(adminToken, 'POST', LIB, { code: `SVC-BAD-${SUFFIX}`, category: 'GUARD_SERVICE' });
  ok(r.status === 400, `missing name → 400 (got ${r.status})`);

  r = await req(adminToken, 'POST', LIB, { code: `SVC-BAD-${SUFFIX}`, name: 'Bad', category: 'NOT_A_CATEGORY' });
  ok(r.status === 400, `bad category → 400 (got ${r.status})`);

  r = await req(adminToken, 'POST', LIB, { code: `bad code!`, name: 'Bad', category: 'CCTV' });
  ok(r.status === 400, `invalid code chars → 400 (got ${r.status})`);

  r = await req(adminToken, 'POST', LIB, { code: `SVC-NEG-${SUFFIX}`, name: 'Neg price', category: 'CCTV', defaultUnitPrice: -5 });
  ok(r.status === 400, `negative defaultUnitPrice → 400 (got ${r.status})`);
  ok(await ServiceLibraryItem.countDocuments({}) === 0, 'no entry was persisted despite failed creates');

  r = await req(adminToken, 'POST', LIB, {
    code: `SVC-DUPK-${SUFFIX}`, name: 'Dup keys', category: 'CUSTOM', unit: 'MONTH',
    structuredDetails: [
      { key: 'warranty', label: 'Warranty', value: '1 year' },
      { key: 'WARRANTY', label: 'Warranty 2', value: '2 years' },
    ],
  });
  ok(r.status === 400, `duplicate detail keys → 400 (got ${r.status})`);

  r = await req(adminToken, 'POST', LIB, {
    code: `SVC-EQ-${SUFFIX}`, name: 'CCTV kit', category: 'CCTV',
    equipmentItems: [{ name: '', quantity: 2, unit: 'PCS' }],
  });
  ok(r.status === 400, `equipment item missing name → 400 (got ${r.status})`);

  // ── 3. CRUD — guard service mirroring Tiga Hotel-style figures ─────
  // The token payload is re-read from the DB each request (authenticate), so
  // the existing token picks the grant up automatically on the next call — verify it:
  const svc = await req(adminToken, 'POST', LIB, {
    code: `SVC-GUARD-${SUFFIX}`,
    name: 'Security Guard Service — Male & Female',
    description: 'Uniformed security guard service, per the standard shift pattern.',
    category: 'GUARD_SERVICE',
    unit: 'MONTH',
    pricingModel: 'MONTHLY_PER_GUARD',
    maleGuardsPerDay: 3,
    femaleGuardsPerDay: 2,
    maleGuardsPerMonth: 9,
    femaleGuardsPerMonth: 2,
    monthlySalaryBeforeVatMale: 12000,
    monthlySalaryBeforeVatFemale: 12000,
    shiftNote: 'Post shift 06:00–06:00 (24h on / 48h rest, per Ethiopian labor law). 3 male/day with 2 replacements = 9/month; 2 female split the late-night hours (Tiga Hotel reference).',
    structuredDetails: [{ key: 'responseTime', label: 'Response Time', value: '15 minutes' }],
  });
  ok(svc.status === 201, `guard service create → 201 (got ${svc.status}: ${JSON.stringify(svc.json).slice(0, 160)})`);
  const svcId = svc.json?.data?._id as string;
  ok(!!svcId, 'created entry has _id');
  ok(svc.json.data.createdBy === String(admin._id), 'createdBy recorded');
  ok(svc.json.data.structuredDetails.some((d: any) => d.key === 'monthlySalaryBeforeVatMale' && d.value === '12000'),
    'male salary detail row auto-mirrored');
  ok(svc.json.data.structuredDetails.some((d: any) => d.key === 'shiftNote'),
    'shift note detail row auto-mirrored');
  ok(svc.json.data.structuredDetails.some((d: any) => d.key === 'responseTime'),
    'user-supplied detail row preserved');
  ok(svc.json.data.defaultUnitPrice === null, 'defaultUnitPrice null when omitted');

  // duplicate code → 409
  r = await req(adminToken, 'POST', LIB, { code: `SVC-GUARD-${SUFFIX}`, name: 'Dup', category: 'GUARD_SERVICE' });
  ok(r.status === 409, `duplicate active code → 409 (got ${r.status})`);

  // list + filter
  r = await req(adminToken, 'GET', `${LIB}?category=GUARD_SERVICE&active=true`);
  ok(r.status === 200 && Array.isArray(r.json.data) && r.json.data.length === 1, `admin list finds guard entry (got ${r.json.data?.length})`);
  r = await req(hrToken, 'GET', '/api/marketing/service-library');
  ok(r.status === 403, `HR still 403 on read without grant (got ${r.status})`);

  // grant HR the marketing bundle → read ok, write ok
  await User.updateOne({ _id: hr._id }, { $set: { moduleGrants: ['marketing'] } });
  r = await req(hrToken, 'GET', '/api/marketing/service-library');
  ok(r.status === 200, `HR with grant GET → 200 (got ${r.status})`);

  // update — reprice the female salary (Garment Residence-style tweak)
  r = await req(hrToken, 'PUT', `${LIB}/${svcId}`, {
    femaleGuardsPerMonth: 11,
    monthlySalaryBeforeVatFemale: 15000,
    structuredDetails: [{ key: 'responseTime', label: 'Response Time', value: '10 minutes' }],
  });
  ok(r.status === 200, `update → 200 (got ${r.status}: ${JSON.stringify(r.json).slice(0, 140)})`);
  ok(r.json.data.femaleGuardsPerMonth === 11, 'femaleGuardsPerMonth updated');
  const rows = r.json.data.structuredDetails as { key: string; value: string }[];
  ok(rows.find((d) => d.key === 'monthlySalaryBeforeVatFemale')?.value === '15000', 'mirrored female salary row updated');
  ok(rows.filter((d) => d.key === 'responseTime').length === 1 && rows.find((d) => d.key === 'responseTime')?.value === '10 minutes',
    'user detail row replaced not duplicated');
  // Code-change collision check
  const second = await req(adminToken, 'POST', LIB, { code: `SVC-PATROL-${SUFFIX}`, name: 'QR Patrol', category: 'QR_PATROL', unit: 'POINT', defaultUnitPrice: 0 });
  ok(second.status === 201 && second.json.data.defaultUnitPrice === null, 'zero price treated as "unset" (null)');
  r = await req(hrToken, 'PUT', `${LIB}/${svcId}`, { code: `SVC-PATROL-${SUFFIX}` });
  ok(r.status === 409, `code change into existing active code → 409 (got ${r.status})`);

  // ── 4. deactivation flow ───────────────────────────────────────────
  r = await req(hrToken, 'DELETE', `${LIB}/${second.json.data._id}`);
  ok(r.status === 200, `soft delete → 200 (got ${r.status})`);
  let doc = await ServiceLibraryItem.findById(second.json.data._id);
  ok(!!doc && doc.isActive === false && !!doc.deactivatedAt, 'soft-deactivated doc kept with deactivatedAt');

  r = await req(adminToken, 'PUT', `${LIB}/${second.json.data._id}`, { name: 'Should fail' });
  ok(r.status === 400, `update of deactivated entry → 400 (got ${r.status})`);

  r = await req(adminToken, 'GET', `${LIB}?active=true`);
  ok((r.json.data as any[]).every((d) => d.isActive), 'active filter returns only active rows');

  // Re-create the deactivated code → 409 with reactivate hint
  r = await req(adminToken, 'POST', LIB, { code: `SVC-PATROL-${SUFFIX}`, name: 'Fresh patrol', category: 'QR_PATROL' });
  ok(r.status === 409, `recreating an inactive code → 409 (got ${r.status})`);
  ok(String(r.json.message || '').toLowerCase().includes('reactivate'), '409 message suggests reactivation');

  r = await req(hrToken, 'POST', `${LIB}/${second.json.data._id}/reactivate`);
  ok(r.status === 200, `reactivate → 200 (got ${r.status})`);
  doc = await ServiceLibraryItem.findById(second.json.data._id);
  ok(!!doc && doc.isActive === true && !doc.deactivatedAt, 'reactivated doc has deactivatedAt cleared');

  // Re-deactivate for the legacy cleanup path
  await req(hrToken, 'DELETE', `${LIB}/${second.json.data._id}`);

  // CEO with grant: read allowed, write impossible
  await User.updateOne({ _id: ceo._id }, { $set: { moduleGrants: ['marketing'] } });
  r = await req(ceoToken, 'GET', '/api/marketing/service-library');
  ok(r.status === 200, `CEO with marketing grant GET → 200 (got ${r.status})`);
  r = await req(ceoToken, 'POST', LIB, { code: `SVC-CEO-${SUFFIX}`, name: 'CEO Attempt', category: 'CUSTOM' });
  ok(r.status === 403, `CEO with grant POST → 403 (mandatory deny) (got ${r.status})`);

  // ── 5. audit trail ─────────────────────────────────────────────────
  const actions = ['SERVICE_LIBRARY_CREATE', 'SERVICE_LIBRARY_UPDATE', 'SERVICE_LIBRARY_DEACTIVATE', 'SERVICE_LIBRARY_REACTIVATE'];
  for (const action of actions) {
    const count = await AuditLog.countDocuments({ entity: 'ServiceLibraryItem', action });
    ok(count >= 1, `audit ${action} recorded (${count})`);
  }
  const createRow = await AuditLog.findOne({ entity: 'ServiceLibraryItem', action: 'SERVICE_LIBRARY_CREATE' }).lean();
  ok(!!createRow?.newValues && String((createRow as any).newValues.code || '').startsWith('SVC-'), 'audit newValues carries the created doc');

  // ── cleanup (ephemeral DB — extra safety, never touches other data) ─
  await ServiceLibraryItem.deleteMany({});
  await AuditLog.deleteMany({ entity: 'ServiceLibraryItem' });
  await User.deleteMany({ _id: { $in: [admin._id, hr._id, ceo._id, guard._id] } });
  await mongoose.disconnect();
  server.close();

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch { /* noop */ }
  process.exit(1);
});
