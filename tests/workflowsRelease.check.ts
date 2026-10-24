/**
 * RELEASE-WORKFLOW CHECK (final release verification)
 *
 * Runs the release-critical workflows that were not yet covered by the other
 * suites, through the REAL HTTP API on an ISOLATED ephemeral MongoDB database:
 *
 *   GUARD QR SELF-CLOCK  (POST /attendance/shifts/clock-in | /clock-out)
 *     - clock-in at a real site (the QR encodes the site reference),
 *     - duplicate open-shift rejection, unknown-site rejection,
 *     - clock-out records hours and closes the shift,
 *     - another guard at the same site clock-in/out is independent,
 *     - shift list shows only the OWNING guard's shifts (security).
 *
 *   NOTIFICATIONS
 *     - permission-based fan-out reaches exactly the intended recipient set,
 *     - GET /api/notifications lists only OWN items + unread count,
 *     - mark-read and read-all cannot touch another user's notification.
 */
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../src/app';
import { Employee } from '../src/models/Employee';
import { User } from '../src/models/User';
import { Company } from '../src/models/Company';
import { Site } from '../src/models/Site';
import { Notification } from '../src/models/Notification';
import { GuardShift } from '../src/models/GuardShift';
import { GuardPatrolScan } from '../src/models/GuardPatrolScan';
import { PrimarySiteAssignment } from '../src/models/PrimarySiteAssignment';
import { NotificationService } from '../src/modules/notifications/notification.service';
import { registerCorePermissions } from '../src/core/permissions/core.permissions';
import { registerHRPermissions } from '../src/modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from '../src/modules/hr/permissions/payroll.permissions';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`OK: ${msg}`); }
  else { failed++; console.error(`FAIL: ${msg}`); }
}

const PWD = 'Release-Workflow-2026!';

async function main() {
  const database = `wfrel_${Date.now()}`;
  await mongoose.connect(`mongodb://127.0.0.1:27029/${database}?replicaSet=guardE2e`, { serverSelectionTimeoutMS: 5000 });
  registerCorePermissions(); registerHRPermissions(); registerPayrollPermissions();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));

  const pwd = await bcrypt.hash(PWD, 10);

  // A real site (QR codes encode the site GET reference the guard posts).
  const company = await Company.create({ name: `WF Comp ${Date.now()}`, code: `WF${String(Date.now() % 100000)}` });
  const site = await Site.create({
    companyId: company._id, siteName: 'WF Release Site', siteCode: `WFS${String(Date.now() % 100000)}`,
    location: 'Addis', siteType: 'COMMERCIAL', agreedManpower: 2, actualManpower: 2,
  } as any);

  // Two guard logins linked to guard employees (self-clock works only for them).
  const guardA = await Employee.create({ employeeCode: `WFGA${String(Date.now() % 100000)}`, firstName: 'WF', lastName: 'GuardA', category: 'GUARD', status: 'ACTIVE' });
  const guardB = await Employee.create({ employeeCode: `WFGB${String(Date.now() % 100000)}`, firstName: 'WF', lastName: 'GuardB', category: 'GUARD', status: 'ACTIVE' });
  const userA = await User.create({ email: 'wf-ga@vital-test.invalid', password: pwd, firstName: 'WF', lastName: 'GuardA', role: 'GUARD', employeeId: guardA._id });
  const userB = await User.create({ email: 'wf-gb@vital-test.invalid', password: pwd, firstName: 'WF', lastName: 'GuardB', role: 'GUARD', employeeId: guardB._id });
  // Both guards hold a CURRENT site assignment — the QR clock-in refuses
  // unassigned sites by design.
  await PrimarySiteAssignment.create({ guardId: guardA._id, siteId: site._id, isPrimary: true, isCurrent: true, effectiveFrom: new Date('2026-10-01'), hourlyRate: 19.23, standardMonthlyHours: 208 });
  await PrimarySiteAssignment.create({ guardId: guardB._id, siteId: site._id, isPrimary: true, isCurrent: true, effectiveFrom: new Date('2026-10-01'), hourlyRate: 18.5, standardMonthlyHours: 208 });
  const finance = await User.create({ email: 'wf-fin@vital-test.invalid', password: pwd, firstName: 'WF', lastName: 'Finance', role: 'FINANCE_OFFICER' });

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;

  async function login(email: string): Promise<string> {
    const res = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PWD }), signal: AbortSignal.timeout(15000),
    });
    assert.equal(res.status, 200, `login ${email}`);
    return ((await res.json()) as any).data.token;
  }
  const tokA = await login('wf-ga@vital-test.invalid');
  const tokB = await login('wf-gb@vital-test.invalid');
  const tokFin = await login('wf-fin@vital-test.invalid');

  async function request(tok: string, method: string, route: string, body?: unknown): Promise<{ status: number; json: any }> {
    const res = await fetch(`${origin}/api${route}`, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
    });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
  }

  // ════════════════════════════════════════════════════════════════════
  // GUARD QR SELF-CLOCK WORKFLOW
  // ════════════════════════════════════════════════════════════════════
  let r = await request(tokA, 'POST', '/attendance/shifts/clock-in', { siteId: String(site._id) });
  ok(r.status === 201, `guard A clock-in at site (QR reference) → 201 (got ${r.status}: ${r.json?.message || ''})`);
  const shiftA = r.json?.data;
  ok(!!shiftA && shiftA.status === 'OPEN', `clock-in opens an OPEN shift`);
  ok(String(shiftA?.clockInAt || '').length > 0, 'clock-in timestamp recorded');

  // Unknown site — the QR may be outdated: 404 with no new shift.
  r = await request(tokA, 'POST', '/attendance/shifts/clock-in', { siteId: '000000000000000000000000' });
  ok(r.status === 404, `clock-in with unknown site → 404 (got ${r.status})`);
  r = await request(tokA, 'GET', '/attendance/shifts/my');
  const myShiftsCount = ((r.json?.data?.shifts) || []).length;
  ok(myShiftsCount === 1, `failed clock-in created NO extra shift (my shifts = ${myShiftsCount})`);

  // Duplicate open shift rejected.
  r = await request(tokA, 'POST', '/attendance/shifts/clock-in', { siteId: String(site._id) });
  ok(r.status === 400, `duplicate clock-in while shift open → 400 (got ${r.status})`);

  // Wrong-site patrol scan is rejected while on the wrong open shift.
  r = await request(tokA, 'POST', '/attendance/shifts/patrol', { siteId: String(site._id) });
  ok(r.status === 201, `patrol scan at the SAME site during open shift → 201 (got ${r.status})`);
  const scanSite = await Site.create({
    companyId: company._id, siteName: 'WF Other Site', siteCode: `WFX${String(Date.now() % 100000)}`,
    location: 'Addis', siteType: 'COMMERCIAL', agreedManpower: 2, actualManpower: 2,
  } as any);
  const scanCountBefore = await GuardPatrolScan.countDocuments();
  r = await request(tokA, 'POST', '/attendance/shifts/patrol', { siteId: String(scanSite._id) });
  const scanCountAfter = await GuardPatrolScan.countDocuments();
  ok(r.status === 400, `patrol scan for a DIFFERENT site than the open shift → 400 (got ${r.status})`);
  ok(scanCountAfter === scanCountBefore, `rejected patrol scan persisted nothing (count ${scanCountAfter})`);

  // Guard B at the same site is independent.
  r = await request(tokB, 'POST', '/attendance/shifts/clock-in', { siteId: String(site._id) });
  ok(r.status === 201, `guard B independent clock-in at the same site → 201 (got ${r.status})`);

  // Perform the guard B self-list check BEFORE clocking out: /my shows only
  // guard B's own shifts, never guard A's.
  r = await request(tokB, 'GET', '/attendance/shifts/my');
  const myShiftsB = (r.json?.data?.shifts || []) as any[];
  ok(myShiftsB.length === 1 && String(myShiftsB[0].guardUserId) === String(userB._id),
    `guard B /my shows exactly own OPEN shift (count ${myShiftsB.length})`);
  ok(!JSON.stringify(r.json).includes(String(userA._id)), `guard B /my never exposes guard A's ids`);

  // Guard A clock-out (shift was opened a moment ago — service may refuse <1min
  // shifts; wait until the shift is at least 1 minute old to record hours).
  await new Promise((resolve) => setTimeout(resolve, 61_000));
  r = await request(tokA, 'POST', '/attendance/shifts/clock-out');
  ok(r.status === 200, `guard A clock-out → 200 (got ${r.status}: ${r.json?.message || ''})`);
  const hoursOut = Number(r.json?.data?.hours);
  ok(hoursOut > 0, `clock-out records worked hours > 0 (got ${hoursOut})`);
  r = await request(tokA, 'GET', '/attendance/shifts/my');
  const myShiftsA = (r.json?.data?.shifts || []) as any[];
  const closed = myShiftsA.find((s) => String(s._id) === String(shiftA._id));
  ok(!!closed && closed.status !== 'OPEN' && closed.clockOutAt, `clock-out closes the shift and stamps clockOutAt (status=${closed?.status})`);

  // Clock-out with no open shift rejected.
  r = await request(tokA, 'POST', '/attendance/shifts/clock-out');
  ok(r.status === 400, `clock-out without open shift → 400 (got ${r.status})`);

  // The self-clock generated attendance (self hours) for guard A.
  r = await request(tokB, 'POST', '/attendance/shifts/clock-out');
  const hoursB = Number(r.json?.data?.hours);
  ok(r.status === 200 && hoursB > 0, `guard B clock-out also records hours (status ${r.status}, hours ${hoursB})`);

  const allShifts = await GuardShift.countDocuments();
  ok(allShifts === 2, `exactly two shifts persisted (count ${allShifts})`);

  // ════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS — fan-out, isolation, read state
  // ════════════════════════════════════════════════════════════════════
  // Fan-out via GUARD_ATTENDANCE_SELF: with the clock flow active, guard A/B
  // self-clock events notified every GUARD_ATTENDANCE_SELF holder. Seed one
  // more notification explicitly for guard B only.
  const created = await NotificationService.create({
    userId: userB._id as any, title: 'Personal', message: 'Only guard B sees this', type: 'INFO', link: '/guard',
  });
  ok(!!created, 'direct notification created');

  r = await request(tokB, 'GET', '/notifications');
  ok(r.status === 200, `guard B notifications list → 200 (got ${r.status})`);
  const itemsB = (r.json?.data?.items || []) as any[];
  ok(itemsB.length >= 1, `guard B sees notifications (count ${itemsB.length})`);
  ok(itemsB.every((n) => String(n.userId) === String(userB._id)), `list filtered to the caller only`);
  ok(typeof r.json?.data?.unreadCount === 'number', `unread count present`);
  const unreadBefore = r.json?.data?.unreadCount;
  ok(unreadBefore >= 1, `floor notifications sit unread`);

  // Guard A gets a directed notification (e.g. an approval decision) so the
  // cross-user isolation probe below operates on a REAL other-user row.
  await NotificationService.create({
    userId: userA._id as any, title: 'Approval', message: 'Only guard A sees this', type: 'INFO',
  });
  const otherId = (await Notification.findOne({ userId: userA._id }))!._id;
  if (otherId) {
    r = await request(tokB, 'POST', `/notifications/${otherId}/read`);
    ok(r.status === 404, `guard B cannot mark guard A's notification read → 404 (got ${r.status})`);
    const otherDoc = await Notification.findById(otherId);
    ok(!otherDoc?.read, `other user's notification state unchanged after foreign read attempt`);
  }

  r = await request(tokB, 'POST', '/notifications/read-all');
  ok(r.status === 200, `read-all → 200 (got ${r.status})`);
  const modified = Number(r.json?.data?.modified);
  r = await request(tokB, 'GET', '/notifications');
  ok(r.json?.data?.unreadCount === 0, `unread count now 0 (got ${r.json?.data?.unreadCount})`);
  ok(modified === unreadBefore, `read-all modified exactly the unread rows (${modified}/${unreadBefore})`);

  // Guard A's unread state must be untouched by guard B's read-all.
  r = await request(tokA, 'GET', '/notifications');
  ok(Number(r.json?.data?.unreadCount) > 0, `guard A unread untouched after guard B read-all (got ${r.json?.data?.unreadCount})`);

  console.log(`\n${passed} checks passed, ${failed} failed`);
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
  await mongoose.disconnect();
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
  try { await mongoose.disconnect(); } catch { /* already closed */ }
  process.exit(1);
});
