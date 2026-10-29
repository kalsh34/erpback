/**
 * PROFORMA REGRESSION SUITE (Marketing Phase C)
 *
 * Exercises the REAL HTTP surface of /api/marketing/proformas against an
 * ephemeral database on the configured MongoDB — never touches payroll or
 * other collections; everything created here lives in a throwaway DB name.
 *
 * Covered:
 *   - authentication (401 without a token) and authorization (403 without
 *     service permissions; role defaults; marketing module grant; CEO's
 *     mandatory SERVICE_MANAGE deny)
 *   - validation (400 on missing client, missing/unknown service lines,
 *     negative amounts, discount exceeding the line amount, bad vatRate)
 *   - never trusting client totals (bogus submitted earnings are discarded)
 *   - calculation accuracy (lineTotal, discount, subtotal, VAT 15%, VAT 0)
 *   - concurrent duplicate-safe numbering (parallel creates → unique numbers)
 *   - immutable service snapshots (library edits after the quote never leak)
 *   - lifecycle (draft edit → issue → immutable; void; amend → revision
 *     → supersede; no parallel live amendments; superseded is terminal)
 *   - audit events for every mutation
 *
 * Run: npx ts-node --transpile-only tests/proforma.check.ts
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
import { Proforma } from '../src/models/Proforma';
import { computeEffectivePermissions } from '../src/middleware/rbac';
import { PERMISSIONS } from '../src/types';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`OK: ${msg}`); }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

const DB_NAME = `proforma_check_${Date.now()}`;
const SUFFIX = `${Date.now()}`.slice(-8);
const PWD = 'Proforma-Check-2026!';
const YEAR = new Date().getFullYear();

async function main() {
  // Ephemeral DB on the configured MongoDB host (never the vitalpayroll DB).
  const [prefix, after] = config.mongoUri.replace(/\/$/, '').split('://') as [string, string];
  const [hostAndPath, query] = after.split('?') as [string, string | undefined];
  const host = hostAndPath.split('/')[0];
  const q = query ? `?${query}` : '';
  const uri = `${prefix}://${host}/${DB_NAME}${q}`;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  console.log(`Ephemeral DB: ${DB_NAME}`);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  try {
    // ── test accounts ────────────────────────────────────────────────
    const hash = await bcrypt.hash(PWD, 10);
    const make = (email: string, role: string, extra: Record<string, unknown> = {}) =>
      User.create({ email, password: hash, firstName: role, lastName: 'Test', role, isActive: true, ...extra });
    const admin = await make(`pf-admin-${SUFFIX}@vital-test.invalid`, 'SUPER_ADMIN');
    const hr = await make(`pf-hr-${SUFFIX}@vital-test.invalid`, 'HR_ADMIN');
    const ceo = await make(`pf-ceo-${SUFFIX}@vital-test.invalid`, 'CEO');
    const guard = await make(`pf-guard-${SUFFIX}@vital-test.invalid`, 'GUARD');
    const head = await make(`pf-head-${SUFFIX}@vital-test.invalid`, 'HEAD');

    // RBAC invariants on the effective-permission model. SUPER_ADMIN's role
    // default is READ-ONLY ("can view everything, cannot modify"), so manage
    // access comes from the marketing module grant.
    ok(computeEffectivePermissions({ role: 'SUPER_ADMIN' } as any).includes(PERMISSIONS.SERVICE_READ),
      'SUPER_ADMIN role default contains SERVICE_READ');
    ok(!computeEffectivePermissions({ role: 'SUPER_ADMIN' } as any).includes(PERMISSIONS.SERVICE_MANAGE),
      'SUPER_ADMIN role default does NOT contain SERVICE_MANAGE (needs the marketing grant)');
    const ceoWithGrant = computeEffectivePermissions({ role: 'CEO', moduleGrants: ['marketing'] } as any);
    ok(ceoWithGrant.includes(PERMISSIONS.SERVICE_READ) && !ceoWithGrant.includes(PERMISSIONS.SERVICE_MANAGE),
      'CEO + marketing grant can read but still CANNOT manage proformas (mandatory deny)');
    const hrWithGrant = computeEffectivePermissions({ role: 'HR_ADMIN', moduleGrants: ['marketing'] } as any);
    ok(hrWithGrant.includes(PERMISSIONS.SERVICE_READ) && hrWithGrant.includes(PERMISSIONS.SERVICE_MANAGE),
      'HR_ADMIN + marketing grant gains read + manage on proformas');

    // Phase C policy: issuing/approving and discount approval are explicit,
    // manager-only permissions OUTSIDE the marketing module bundle — a module
    // grant can never confer them.
    ok(computeEffectivePermissions({ role: 'SUPER_ADMIN' } as any).includes(PERMISSIONS.PROFORMA_ISSUE)
      && computeEffectivePermissions({ role: 'SUPER_ADMIN' } as any).includes(PERMISSIONS.PROFORMA_DISCOUNT),
      'SUPER_ADMIN role defaults explicitly authorize issue + discount approval');
    const headDefaults = computeEffectivePermissions({ role: 'HEAD' } as any);
    ok(headDefaults.includes(PERMISSIONS.PROFORMA_ISSUE) && headDefaults.includes(PERMISSIONS.PROFORMA_DISCOUNT),
      'HEAD role defaults explicitly authorize issue + discount approval');
    ok(!headDefaults.includes(PERMISSIONS.SERVICE_MANAGE),
      'HEAD role defaults do NOT grant draft management (needs a module grant)');
    ok(!hrWithGrant.includes(PERMISSIONS.PROFORMA_ISSUE) && !hrWithGrant.includes(PERMISSIONS.PROFORMA_DISCOUNT),
      'marketing grant does NOT confer issue/discount authority (marketing edits drafts only)');
    ok(!ceoWithGrant.includes(PERMISSIONS.PROFORMA_ISSUE) && !ceoWithGrant.includes(PERMISSIONS.PROFORMA_DISCOUNT),
      'CEO + marketing grant gains NO issue/discount authority (mandatory deny)');

    // ── real HTTP server ─────────────────────────────────────────────
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
    // module grants are applied BEFORE logins: the JWT carries the effective
    // per-user permissions, so a grant requires a fresh token.
    await User.updateOne({ _id: hr._id }, { moduleGrants: ['marketing'] });
    await User.updateOne({ _id: admin._id }, { moduleGrants: ['marketing'] });
    const adminToken = await login(admin.email);
    const hrToken = await login(hr.email);
    const ceoToken = await login(ceo.email);
    const guardToken = await login(guard.email);
    const headToken = await login(head.email);

    async function req(token: string | null, method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
      const res = await fetch(`${origin}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20000),
      });
      let json: any = null;
      try { json = await res.json(); } catch { /* non-JSON */ }
      return { status: res.status, json };
    }

    const LIB = '/api/marketing/service-library';
    const PF = '/api/marketing/proformas';

    // ── library entries to quote from ────────────────────────────────
    const libCreate = await req(adminToken, 'POST', LIB, {
      code: `SVC-PF-GUARD-${SUFFIX}`,
      name: 'Guard Service — 24h shift',
      category: 'GUARD_SERVICE',
      unit: 'MONTH',
      pricingModel: 'MONTHLY_PER_GUARD',
      maleGuardsPerDay: 2,
      femaleGuardsPerDay: 1,
      monthlySalaryBeforeVatMale: 12000,
      monthlySalaryBeforeVatFemale: 11500,
      defaultUnitPrice: 12000,
      shiftNote: '24h on / 48h off',
    });
    assert.equal(libCreate.status, 201, `library create: ${JSON.stringify(libCreate.json)}`);
    const libGuard = libCreate.json.data;

    const libCreate2 = await req(adminToken, 'POST', LIB, {
      code: `SVC-PF-CCTV-${SUFFIX}`,
      name: 'CCTV — 4 cameras',
      category: 'CCTV',
      unit: 'POINT',
      pricingModel: 'PER_INSTALLATION',
      installationNote: 'Surface conduit included',
      equipmentItems: [{ name: 'IP Camera 4MP', quantity: 4, unit: 'PCS' }, { name: 'NVR 4CH', quantity: 1, unit: 'PCS' }],
    });
    assert.equal(libCreate2.status, 201, `library create 2: ${JSON.stringify(libCreate2.json)}`);
    const libCctv = libCreate2.json.data;

    // ── 1. authentication & authorization ────────────────────────────
    let r = await req(null, 'GET', PF);
    ok(r.status === 401, 'listing proformas without a token → 401');
    r = await req(null, 'POST', PF, { client: { name: 'X' }, lines: [] });
    ok(r.status === 401, 'creating a proforma without a token → 401');

    r = await req(guardToken, 'GET', PF);
    ok(r.status === 403, 'GUARD without marketing access → 403 on list');

    r = await req(guardToken, 'POST', PF, { client: { name: 'X' }, lines: [] });
    ok(r.status === 403, 'GUARD → 403 on create');
    r = await req(ceoToken, 'POST', PF, { client: { name: 'X' }, lines: [] });
    ok(r.status === 403, 'CEO + real grant → 403 on create (mandatory SERVICE_MANAGE deny)');

    // HR needs the module grant for reads too — the pre-granted HR token has it
    r = await req(hrToken, 'GET', PF);
    ok(r.status === 200, 'HR_ADMIN with the marketing module grant → 200 on read');
    const hrGrantedToken = hrToken;
    r = await req(hrGrantedToken, 'POST', PF, { client: { name: 'X' }, lines: [] });
    ok(r.status === 400, 'HR_ADMIN with grant reaches the create validator (400 on empty lines, not 403)');

    // ── 1b. Phase C policy: draft-edit ≠ issuing ≠ discount approval ──
    // A marketing user (module grant) manages drafts; issuing and discounting
    // need the explicit PROFORMA_ISSUE / PROFORMA_DISCOUNT permissions. Every
    // rejection below must leave the record untouched.
    r = await req(hrGrantedToken, 'POST', PF, {
      client: { name: 'Marketing Draft Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 9000 }],
    });
    ok(r.status === 201, 'marketing user creates a discount-free draft → 201');
    const mktDraftId = r.json.data._id;

    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDraftId}`, { notes: 'Marketing follow-up' });
    ok(r.status === 200 && r.json.data.notes === 'Marketing follow-up',
      'marketing user edits their own draft (non-discount fields)');

    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDraftId}`, {
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 9000, discountAmount: 1000 }],
    });
    ok(r.status === 403, 'marketing user CANNOT apply a discount (manager-only)');

    r = await req(hrGrantedToken, 'GET', `${PF}/${mktDraftId}`);
    ok(r.json.data.lines[0].discountAmount === 0,
      'rejected discount attempt leaves the draft untouched');

    r = await req(hrGrantedToken, 'POST', PF, {
      client: { name: 'Marketing Discount Try' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 9000, discountAmount: 500 }],
    });
    ok(r.status === 403, 'marketing user cannot even CREATE a draft carrying a discount');

    // GUARD has no module access at all — every action is out of bounds.
    r = await req(guardToken, 'PUT', `${PF}/${mktDraftId}`, { notes: 'no' });
    ok(r.status === 403, 'GUARD → 403 on draft edit');
    r = await req(guardToken, 'POST', `${PF}/${mktDraftId}/void`);
    ok(r.status === 403, 'GUARD → 403 on void');
    r = await req(guardToken, 'POST', `${PF}/${mktDraftId}/amend`);
    ok(r.status === 403, 'GUARD → 403 on amend');
    r = await req(guardToken, 'POST', `${PF}/${mktDraftId}/issue`);
    ok(r.status === 403, 'GUARD → 403 on issue');

    // Issue attempts by users without PROFORMA_ISSUE: no mutation whatsoever.
    r = await req(hrGrantedToken, 'POST', `${PF}/${mktDraftId}/issue`);
    ok(r.status === 403, 'marketing user holding SERVICE_MANAGE CANNOT issue');
    r = await req(ceoToken, 'POST', `${PF}/${mktDraftId}/issue`);
    ok(r.status === 403, 'CEO + marketing grant CANNOT issue (mandatory deny)');
    r = await req(hrGrantedToken, 'GET', `${PF}/${mktDraftId}`);
    ok(r.json.data.status === 'DRAFT' && !r.json.data.issuedBy,
      'all denied issue attempts leave the draft DRAFT and unissued');

    // An authorized manager (admin = SUPER_ADMIN role defaults) owns discounts:
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Manager Discounted Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 2, unitPrice: 5000, discountAmount: 500 }],
    });
    ok(r.status === 201 && r.json.data.lines[0].lineTotal === 9500,
      'authorized manager applies a discount at create (2×5000 − 500 = 9500)');
    const mktDiscDraftId = r.json.data._id;

    // A marketing edit that keeps the approved discount exactly as-is works…
    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDiscDraftId}`, { notes: 'bookkeeping only' });
    ok(r.status === 200 && r.json.data.lines[0].discountAmount === 500,
      'marketing edit without touching the approved discount succeeds');
    // …while changing it in any direction must not.
    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDiscDraftId}`, {
      lines: [{ serviceItemId: libGuard._id, quantity: 2, unitPrice: 5000, discountAmount: 800 }],
    });
    ok(r.status === 403, 'marketing user CANNOT change an approved discount');
    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDiscDraftId}`, {
      lines: [{ serviceItemId: libGuard._id, quantity: 2, unitPrice: 5000, discountAmount: 0 }],
    });
    ok(r.status === 403, 'marketing user CANNOT remove an approved discount');
    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDiscDraftId}`, {
      lines: [{ serviceItemId: libGuard._id, quantity: 3, unitPrice: 5000 }],
    });
    ok(r.status === 403, 'marketing user cannot remove a discount by editing its terms');
    r = await req(hrGrantedToken, 'PUT', `${PF}/${mktDiscDraftId}`, {
      lines: [{ serviceItemId: libCctv._id, quantity: 1, unitPrice: 1000 }],
    });
    ok(r.status === 403, 'marketing user cannot remove a discount by dropping the line');
    r = await req(hrGrantedToken, 'GET', `${PF}/${mktDiscDraftId}`);
    ok(r.json.data.lines[0].discountAmount === 500 && r.json.data.subtotal === 9500,
      'denied discount edits leave the approved amount and totals intact');


    // ── 2. validation ────────────────────────────────────────────────
    r = await req(adminToken, 'POST', PF, { lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 100 }] });
    ok(r.status === 400, 'missing client.name → 400');
    r = await req(adminToken, 'POST', PF, { client: { name: 'X' }, lines: [] });
    ok(r.status === 400, 'empty lines → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' },
      lines: [{ serviceItemId: '000000000000000000000000', quantity: 1, unitPrice: 1 }],
    });
    ok(r.status === 400, 'unknown serviceItemId → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' },
      lines: [{ serviceItemId: libGuard._id, quantity: -1, unitPrice: 100 }],
    });
    ok(r.status === 400, 'negative quantity → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' },
      lines: [{ serviceItemId: libGuard._id, quantity: 2, unitPrice: -5 }],
    });
    ok(r.status === 400, 'negative unitPrice → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 100, discountAmount: 200 }],
    });
    ok(r.status === 400, 'discount exceeding quantity × unitPrice → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' }, vatRate: 1.5,
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 100 }],
    });
    ok(r.status === 400, 'vatRate above 1 → 400');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'X' }, vatRate: 'abc',
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 100 }],
    });
    ok(r.status === 400, 'non-numeric vatRate → 400');
    r = await req(adminToken, 'GET', `${PF}?status=NOPE`);
    ok(r.status === 400, 'unknown status filter → 400');
    r = await req(adminToken, 'GET', `${PF}/not-an-id`);
    ok(r.status === 400, 'invalid proforma id → 400');
    r = await req(adminToken, 'GET', `${PF}/000000000000000000000000`);
    ok(r.status === 404, 'unknown proforma id → 404');

    // ── 3. client totals are never trusted ───────────────────────────
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Loyalty Hotel' },
      vatRate: 0.15,
      lines: [{ serviceItemId: libGuard._id, quantity: 6, unitPrice: 12000 }],
      subtotal: 1, vatAmount: 1, grandTotal: 1,
    });
    ok(r.status === 201, 'create with forged totals → 201');
    let pf = r.json.data;
    ok(pf.subtotal === 72000 && pf.vatAmount === 10800 && pf.grandTotal === 82800,
      `server recomputes money (subtotal 72000, VAT 10800, total 82800) — got ${pf.subtotal}/${pf.vatAmount}/${pf.grandTotal}`);
    const pfA = pf;

    // ── 4. calculation accuracy ──────────────────────────────────────
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Garment Residence', contactPerson: 'W/ro Selam', tin: 'TIN-123' },
      vatRate: 0.15,
      lines: [
        { serviceItemId: libGuard._id, quantity: 6, unitPrice: 12000 },
        { serviceItemId: libCctv._id, quantity: 1, unitPrice: 4500, discountAmount: 500 },
      ],
      notes: 'Quotation valid as discussed with procurement.',
    });
    ok(r.status === 201, 'multi-line create → 201');
    pf = r.json.data;
    ok(pf.lines[0].lineTotal === 72000, 'guard line total 6 × 12000 = 72000');
    ok(pf.lines[1].lineTotal === 4000, 'cctv line total 1 × 4500 − 500 = 4000');
    ok(pf.subtotal === 76000 && pf.vatAmount === 11400 && pf.grandTotal === 87400,
      `two-line totals 76000 / 11400 / 87400 — got ${pf.subtotal}/${pf.vatAmount}/${pf.grandTotal}`);
    const pfB = pf;

    r = await req(adminToken, 'POST', PF, {
      client: { name: 'No-VAT Clinic' },
      vatRate: 0,
      lines: [{ serviceItemId: libCctv._id, quantity: 2, unitPrice: 2500 }],
    });
    pf = r.json.data;
    ok(pf.vatAmount === 0 && pf.grandTotal === 5000 && pf.subtotal === 5000,
      'vatRate 0 → no VAT, grand total = subtotal');
    const noVatId = pf._id;

    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Custom Rate Co' },
      vatRate: 0.1,
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 11500.05 }],
    });
    pf = r.json.data;
    ok(pf.lines[0].lineTotal === 11500.05, 'rounding keeps 2 decimals on lineTotal');
    ok(pf.vatAmount === 1150.01 && pf.grandTotal === 12650.06,
      `round2 applied to VAT (1150.01) and grand total (12650.06) — got ${pf.vatAmount}/${pf.grandTotal}`);

    // ── 5. snapshots & concurrency-safe numbering ────────────────────
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Snapshot Hotel' },
      lines: [{ serviceItemId: libCctv._id, quantity: 1, unitPrice: 9999 }],
    });
    pf = r.json.data;
    ok(pf.number === `PRO-${YEAR}-0005` || /^PRO-\d{4}-\d{4,}$/.test(pf.number),
      `number format PRO-<YYYY>-#### (${pf.number})`);
    ok(pf.lines[0].snapshot.name === libCctv.name && pf.lines[0].snapshot.equipmentItems.length === 2,
      'line snapshot copies library entry details (name + equipment)');
    ok(pf.lines[0].snapshot.structuredDetails.some((d: any) => d.key === 'equipment:ip camera 4mp'),
      'snapshot carries the mirrored equipment detail rows');
    const snapshotPfId = pf._id;
    const snapshotBeforeName = pf.lines[0].snapshot.name;

    // Library moves on AFTER the quote was drawn...
    r = await req(adminToken, 'PUT', `${LIB}/${libCctv._id}`, {
      name: 'CCTV — RENAMED AFTER QUOTE',
      defaultUnitPrice: 12345,
      equipmentItems: [{ name: 'IP Camera 8MP', quantity: 8, unit: 'PCS' }],
    });
    ok(r.status === 200, 'library entry updated after the quote');
    // ...and it must never leak into an already-written snapshot (drafts are
    // snapshotted at write time; only an explicit line edit re-resolves).
    r = await req(adminToken, 'GET', `${PF}/${snapshotPfId}`);
    ok(r.json.data.lines[0].snapshot.name === snapshotBeforeName,
      'later library edit does not leak into the already-written line snapshot');

    // deactivating the service keeps historical snapshots resolvable
    r = await req(adminToken, 'DELETE', `${LIB}/${libCctv._id}`);
    ok(r.status === 200, 'library deactivation succeeds');

    // Concurrency: 12 parallel creations must all receive unique numbers.
    const concurrent = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        req(adminToken, 'POST', PF, {
          client: { name: `Concurrent Client ${i + 1}` },
          lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 1000 }],
        }))
    );
    ok(concurrent.every((c) => c.status === 201), 'all 12 concurrent creations → 201');
    const numbers = concurrent.map((c) => c.json.data.number as string);
    ok(new Set(numbers).size === 12, `no duplicate numbers under concurrency (${[...new Set(numbers)].length}/12 unique)`);
    ok(numbers.every((n: string) => new RegExp(`^PRO-${YEAR}-\\d{4,}$`).test(n)), 'concurrent numbers follow the format');

    // ── 6. lifecycle: draft editing, issuing, VOID ───────────────────
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Lifecycle Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 6, unitPrice: 12000 }],
      vatRate: 0.15,
    });
    ok(r.status === 201, 'create lifecycle draft');
    const draftId = r.json.data._id;

    r = await req(adminToken, 'PUT', `${PF}/${draftId}`, {
      lines: [
        { serviceItemId: libGuard._id, quantity: 6, unitPrice: 12000 },
        { serviceItemId: libGuard._id, quantity: 1, unitPrice: 11500 },
      ],
      notes: 'Adjusted during negotiation',
    });
    ok(r.status === 200, 'editing lines on a draft → 200');
    ok(r.json.data.grandTotal === 96025, `line recompute: 72000 + 11500 = 83500 → +15% VAT = 96025 — got ${r.json.data.grandTotal}`);

    r = await req(adminToken, 'PUT', `${PF}/${draftId}`, { client: { contactPerson: 'Ato Yared' } });
    ok(r.status === 200 && r.json.data.client.contactPerson === 'Ato Yared' && r.json.data.lines.length === 2,
      'partial client-only edit keeps lines and merges contact');

    // ── validity date: strictly optional, no invented defaults ──────
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'No Expiry Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 2000 }],
    });
    pf = r.json.data;
    ok(pf.validUntil == null, 'omitting validUntil → NO expiry (no default days invented)');
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Dated Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 2000 }],
      validUntil: '2027-03-01',
    });
    pf = r.json.data;
    ok(!!pf.validUntil && String(pf.validUntil).startsWith('2027-03-01'),
      `supplied validity date is validated and persisted (${pf.validUntil})`);
    const datedId = pf._id;
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Bad Date Co' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 2000 }],
      validUntil: 'not-a-date',
    });
    ok(r.status === 400, 'invalid validity date → 400');
    r = await req(adminToken, 'PUT', `${PF}/${datedId}`, { validUntil: null });
    ok(r.status === 200 && r.json.data.validUntil == null, 'clearing the validity date removes the expiry');
    r = await req(adminToken, 'PUT', `${PF}/${datedId}`, { validUntil: '2027-06-30' });
    ok(r.status === 200 && String(r.json.data.validUntil).startsWith('2027-06-30'),
      'editing the validity date is allowed on drafts');

    // ISSUING is manager-only: marketing (SERVICE_MANAGE but no PROFORMA_ISSUE)
    // is rejected before anything changes; the authorized manager approves.
    r = await req(hrGrantedToken, 'POST', `${PF}/${draftId}/issue`);
    ok(r.status === 403, 'marketing user holding SERVICE_MANAGE cannot issue (manager-only)');
    r = await req(hrGrantedToken, 'GET', `${PF}/${draftId}`);
    ok(r.json.data.status === 'DRAFT', 'denied issuance attempt left the draft unissued');

    r = await req(headToken, 'POST', `${PF}/${draftId}/issue`);
    ok(r.status === 200 && r.json.data.status === 'ISSUED', 'authorized manager (HEAD) issues the draft');
    ok(r.json.data.issuedBy === String(head._id), 'issuance records the approving/issuing user');
    ok(!!r.json.data.issuedAt, 'issuance records the approval timestamp');

    r = await req(adminToken, 'POST', `${PF}/${draftId}/issue`);
    ok(r.status === 400, 'issuing an ISSUED proforma again → 400');
    r = await req(hrGrantedToken, 'POST', `${PF}/${draftId}/void`);
    ok(r.status === 400, 'voiding an ISSUED proforma → 400');
    r = await req(hrGrantedToken, 'PUT', `${PF}/${draftId}`, { notes: 'hacked?' });
    ok(r.status === 403, 'editing an ISSUED proforma → 403');

    // Earlier-created quotes stay issuable
    r = await req(adminToken, 'POST', `${PF}/${pfA._id}/issue`);
    ok(r.status === 200 && r.json.data.status === 'ISSUED', 'single-line draft issues cleanly');

    // VOID on a fresh draft
    r = await req(adminToken, 'POST', PF, {
      client: { name: 'Void Me' },
      lines: [{ serviceItemId: libGuard._id, quantity: 1, unitPrice: 100 }],
    });
    const voidedId = r.json.data._id;
    r = await req(adminToken, 'POST', `${PF}/${voidedId}/void`);
    ok(r.status === 200 && r.json.data.status === 'VOID', 'draft void → VOID');
    r = await req(adminToken, 'POST', `${PF}/${voidedId}/issue`);
    ok(r.status === 400, 'issuing a VOID proforma → 400');

    // ── 7. amendments: revision drafts, supersede, no parallel lives ──
    r = await req(adminToken, 'POST', `${PF}/${pfB._id}/issue`);
    ok(r.status === 200, 'pfB issued before the amendment walkthrough');
    r = await req(adminToken, 'POST', `${PF}/${pfB._id}/amend`);
    ok(r.status === 201, 'amending an ISSUED proforma → 201 revision draft');
    let rev = r.json.data;
    ok(rev.status === 'DRAFT' && rev.revisionNumber === 2 && rev.revisesId === pfB._id,
      `revision carries revisionNumber 2 and revises parent (${rev.number})`);
    ok(rev.lines.length === 2 && rev.lines[1].snapshot.name === 'CCTV — 4 cameras',
      'revision CLONES the frozen parent lines (snapshot untouched by the library rename)');
    ok(rev.grandTotal === 87400, 'revision money block resets to the parent values');
    const revId = rev._id;

    // parallel amendment attempt while the live revision exists
    r = await req(adminToken, 'POST', `${PF}/${pfB._id}/amend`);
    ok(r.status === 409, 'second amendment while a live revision exists → 409');

    // revise quantities on the amendment draft, then issue it
    r = await req(adminToken, 'PUT', `${PF}/${revId}`, { notes: 'Revised quantity' });
    ok(r.status === 200, 'revision draft is editable');
    r = await req(adminToken, 'POST', `${PF}/${revId}/issue`);
    ok(r.status === 200 && r.json.data.status === 'ISSUED', 'revision issues → ISSUED');
    ok(r.json.superseded && r.json.superseded.status === 'SUPERSEDED',
      'issuing a revision supersedes the parent automatically');
    ok(r.json.superseded.supersededById === revId, 'parent stores supersededById');

    r = await req(adminToken, 'POST', `${PF}/${pfB._id}/amend`);
    ok(r.status === 409, 'amending a SUPERSEDED proforma → 409');
    r = await req(adminToken, 'PUT', `${PF}/${pfB._id}`, { notes: 'no!' });
    ok(r.status === 403, 'editing a SUPERSEDED proforma → 403');

    // voiding an amendment draft frees the parent for a new amendment
    r = await req(adminToken, 'GET', `${PF}/${pfA._id}`);
    assert.equal(r.status, 200, 'fetch pfA for amendment flow');
    r = await req(adminToken, 'POST', `${PF}/${pfA._id}/amend`);
    ok(r.status === 201, 'amend pfA → revision draft');
    const revAId = r.json.data._id;
    r = await req(adminToken, 'POST', `${PF}/${revAId}/void`);
    ok(r.status === 200 && r.json.data.status === 'VOID', 'voiding an amendment draft → VOID');
    r = await req(adminToken, 'POST', `${PF}/${pfA._id}/amend`);
    ok(r.status === 201, 'after the void, amending the same parent works again (draft freed)');
    ok(r.json.data.revisionNumber === 2, 'fresh amendment keeps the revisionNumber sequence');

    // ── validity rides the whole lifecycle: draft → issued → revision ─
    r = await req(adminToken, 'PUT', `${PF}/${mktDiscDraftId}`, { validUntil: '2027-05-15' });
    ok(r.status === 200, 'manager sets a validity date on the discounted draft');
    r = await req(adminToken, 'POST', `${PF}/${mktDiscDraftId}/issue`);
    ok(r.status === 200 && String(r.json.data.validUntil).startsWith('2027-05-15'),
      'issued snapshot preserves the validity date verbatim');
    r = await req(adminToken, 'POST', `${PF}/${mktDiscDraftId}/amend`);
    ok(r.status === 201 && String(r.json.data.validUntil).startsWith('2027-05-15'),
      'amendment revision copies the validity date into the new draft');
    r = await req(adminToken, 'POST', `${PF}/${r.json.data._id}/void`);
    ok(r.status === 200, 'voiding that revision frees the parent again');

    // ── concurrency: parallel amendments yield exactly one live revision ─
    const amendResults = await Promise.all(
      Array.from({ length: 6 }, () => req(adminToken, 'POST', `${PF}/${mktDiscDraftId}/amend`))
    );
    const winners = amendResults.filter((a) => a.status === 201);
    ok(winners.length === 1,
      `exactly ONE parallel amendment wins (201) — got ${winners.length}`);
    ok(amendResults.filter((a) => a.status === 409).length === 5,
      'losing concurrent amendments → 409 conflicts');
    r = await req(adminToken, 'GET', `${PF}/${mktDiscDraftId}`);
    ok(String(r.json.data.liveRevisionId) === String(winners[0]?.json.data._id),
      'parent records the single winning live revision');
    r = await req(adminToken, 'POST', `${PF}/${winners[0].json.data._id}/void`);
    ok(r.status === 200, 'voiding the winner recovers the parent (no permanent block)');
    r = await req(adminToken, 'POST', `${PF}/${mktDiscDraftId}/amend`);
    ok(r.status === 201, 'parent is amendable again after the conflict storm');
    const stormRevId = r.json.data._id;
    r = await req(adminToken, 'POST', `${PF}/${stormRevId}/void`);
    ok(r.status === 200, 'cleanup: storm revision voided');

    // Failed issuance is harmless: re-issuing an already-issued revision
    // changes nothing and leaves every earlier state intact.
    r = await req(adminToken, 'GET', `${PF}/${mktDiscDraftId}`);
    ok(r.json.data.status === 'ISSUED' && !r.json.data.liveRevisionId && String(r.json.data.supersededById || '') === '',
      'parent stays ISSUED, claim-cleared and not superseded after failed issuance attempts');

    // ── summary of an issued chain in list views ─────────────────────
    r = await req(adminToken, 'GET', `${PF}?status=ISSUED`);
    // list response body: { success, data: [...], pagination: {...} }
    ok(r.status === 200 && Array.isArray(r.json.data) && r.json.data.every((p: any) => p.status === 'ISSUED'), 'status filter ISSUED');
    r = await req(adminToken, 'GET', `${PF}?status=LIVE`);
    ok(r.status === 200 && Array.isArray(r.json.data) && !r.json.data.some((p: any) => ['SUPERSEDED', 'VOID'].includes(p.status)),
      'LIVE filter excludes superseded/void');
    r = await req(adminToken, 'GET', `${PF}?search=Garment`);
    ok(r.status === 200 && Array.isArray(r.json.data) && r.json.data.some((p: any) => p._id === pfB._id),
      'search by client name finds the proforma');
    r = await req(adminToken, 'GET', `${PF}?search=${numbers[0]}`);
    ok(r.status === 200 && Array.isArray(r.json.data) && r.json.data.some((p: any) => p.number === numbers[0]),
      'search by number finds the proforma');

    // ── 8. audit events ────────────────────────────────────────────────
    const counts = await AuditLog.aggregate([
      { $match: { entity: 'Proforma', action: /^PROFORMA_/ } },
      { $group: { _id: '$action', n: { $sum: 1 } } },
    ]);
    const byAction = Object.fromEntries(counts.map((c: any) => [c._id, c.n]));
    ok((byAction.PROFORMA_CREATE ?? 0) >= 19, `audit: PROFORMA_CREATE rows logged (${byAction.PROFORMA_CREATE ?? 0})`);
    ok((byAction.PROFORMA_UPDATE ?? 0) >= 3, `audit: PROFORMA_UPDATE rows logged (${byAction.PROFORMA_UPDATE ?? 0})`);
    ok((byAction.PROFORMA_ISSUE ?? 0) >= 3, `audit: PROFORMA_ISSUE rows logged (${byAction.PROFORMA_ISSUE ?? 0})`);
    ok((byAction.PROFORMA_VOID ?? 0) >= 2, `audit: PROFORMA_VOID rows logged (${byAction.PROFORMA_VOID ?? 0})`);
    ok((byAction.PROFORMA_AMEND ?? 0) >= 3, `audit: PROFORMA_AMEND rows logged (${byAction.PROFORMA_AMEND ?? 0})`);
    ok((byAction.PROFORMA_SUPERSEDED ?? 0) >= 1, `audit: PROFORMA_SUPERSEDED rows logged (${byAction.PROFORMA_SUPERSEDED ?? 0})`);
    ok((byAction.PROFORMA_DISCOUNT ?? 0) >= 1, `audit: PROFORMA_DISCOUNT approval rows logged (${byAction.PROFORMA_DISCOUNT ?? 0})`);

    // No misleading success events: every ISSUE audit row describes an actual
    // ISSUED document written by a real actor; rejected attempts produce none.
    const issueRows = await AuditLog.find({ entity: 'Proforma', action: 'PROFORMA_ISSUE' });
    ok(issueRows.length > 0
      && issueRows.every((row: any) => row.newValues?.status === 'ISSUED' && !!row.userId),
      'every PROFORMA_ISSUE audit row is a genuine issuance by a real actor (no events for rejected attempts)');
    const discountRows = await AuditLog.find({ entity: 'Proforma', action: 'PROFORMA_DISCOUNT' });
    ok(discountRows.length > 0 && discountRows.every((row: any) => !!row.userId),
      'PROFORMA_DISCOUNT rows record the approving manager');
    const firstCreate = await AuditLog.findOne({ entity: 'Proforma', action: 'PROFORMA_CREATE' });
    const knownActors = [admin._id, hr._id, head._id].map(String);
    ok(!!firstCreate?.userId && knownActors.includes(String(firstCreate.userId)),
      'audit rows store the acting user');
    const headIssueRow = await AuditLog.findOne({ entity: 'Proforma', action: 'PROFORMA_ISSUE', userId: head._id });
    ok(!!headIssueRow, 'audit events identify the correct actor (HEAD manager issuance row exists)');
  } finally {
    console.log(`\n---------- proforma.check: ${passed} passed, ${failed} failed ----------`);
    try { await mongoose.connection.dropDatabase(); console.log(`Dropped ephemeral DB ${DB_NAME}`); } catch (e) { console.error('drop failed:', e); }
    await mongoose.disconnect();
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
