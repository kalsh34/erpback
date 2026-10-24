import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { GuardShiftService } from '../src/modules/hr/guardAttendance/guardShift.service';
import { GuardShift } from '../src/models/GuardShift';
import { GuardPatrolScan } from '../src/models/GuardPatrolScan';
import { PrimarySiteAssignment } from '../src/models/PrimarySiteAssignment';
import { Employee } from '../src/models/Employee';
import { Site } from '../src/models/Site';
import { User } from '../src/models/User';
import { EmployeeCategory, EmployeeStatus, SiteStatus, SiteType, UserRole } from '../src/types';

/**
 * Isolated shift-flow check. It only ever touches a throwaway database whose
 * name starts with guard_shift_check_ on a local MongoDB, and drops it when
 * finished. Override the server with SHIFT_CHECK_MONGO (host only, no db path).
 * Usage: npx ts-node --transpile-only tests/guardShift.check.ts
 */
const dbName = `guard_shift_check_${Date.now()}`;
const host = process.env.SHIFT_CHECK_MONGO || 'mongodb://127.0.0.1:27017';
const uri = `${host.replace(/\/$/, '')}/${dbName}`;

async function expectReject(label: string, fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (err: any) {
    assert.match(String(err?.message || err), pattern, `${label}: wrong error "${err?.message}"`);
    console.log(`PASS ${label}`);
    return;
  }
  throw new Error(`${label}: expected a rejection`);
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (!mongoose.connection.db!.databaseName.startsWith('guard_shift_check_')) {
    throw new Error('Refusing non-isolated database');
  }
  await Promise.all([GuardShift.init(), GuardPatrolScan.init(), PrimarySiteAssignment.init()]);

  const stamp = Date.now();
  const guard = await Employee.create({
    employeeCode: `SHIFT-${stamp}`,
    firstName: 'Test',
    lastName: 'Guard',
    category: EmployeeCategory.GUARD,
    status: EmployeeStatus.ACTIVE,
  });
  const user = await User.create({
    email: `shift.${stamp}@example.test`,
    password: 'not-used-in-this-check',
    firstName: 'Test',
    lastName: 'Guard',
    role: UserRole.GUARD,
    employeeId: guard._id,
  });
  const siteBase = { location: 'Addis Ababa', siteType: SiteType.RESIDENTIAL, agreedManpower: 1, actualManpower: 1, status: SiteStatus.ACTIVE };
  const site = await Site.create({ ...siteBase, siteName: 'Check Site A', siteCode: `CHKA${stamp}` });
  const otherSite = await Site.create({ ...siteBase, siteName: 'Check Site B', siteCode: `CHKB${stamp}` });
  await PrimarySiteAssignment.create({
    guardId: guard._id,
    siteId: site._id,
    role: 'GUARD',
    isPrimary: true,
    standardMonthlyHours: 240,
    hourlyRate: 50,
    effectiveFrom: new Date(Date.now() - 86_400_000),
    isCurrent: true,
  });

  const userId = (user._id as any).toString();
  const siteId = (site._id as any).toString();
  const otherId = (otherSite._id as any).toString();

  await expectReject('clock in at unassigned site is refused', () => GuardShiftService.clockIn(userId, otherId), /not assigned/);

  const shift = await GuardShiftService.clockIn(userId, siteId);
  assert.equal(shift.status, 'OPEN');
  console.log('PASS clock in opens an OPEN shift at the assigned site');

  await expectReject('second clock in while open is refused', () => GuardShiftService.clockIn(userId, siteId), /open shift/);

  await expectReject('patrol at a different site is refused', () => GuardShiftService.recordPatrol(userId, otherId), /different site/);
  const scan = await GuardShiftService.recordPatrol(userId, siteId);
  assert.equal(scan.shiftId.toString(), (shift._id as any).toString());
  console.log('PASS patrol scan at the open shift site is recorded against the shift');

  // Backdate the clock-in so the worked duration is measurable (clock-out refuses < 1 minute).
  await GuardShift.updateOne({ _id: shift._id }, { $set: { clockInAt: new Date(Date.now() - 2 * 3_600_000) } });

  const closed = await GuardShiftService.clockOut(userId);
  assert.equal(closed.shift.status, 'CLOSED');
  assert.ok(closed.hours >= 1.99 && closed.hours <= 2.01, `hours ${closed.hours}`);
  console.log(`PASS clock out closes the shift with ${closed.hours}h`);

  await expectReject('clock out with no open shift is refused', () => GuardShiftService.clockOut(userId), /No open shift/);

  const mine = await GuardShiftService.getMyShifts(userId);
  assert.equal(mine.openShift, null);
  assert.equal(mine.shifts.length, 1);
  assert.equal((mine.shifts[0] as any).patrolCount, 1);
  console.log('PASS shift history for the linked guard shows 1 shift with 1 patrol');

  const activity = await GuardShiftService.listActivity({ from: shift.date, to: shift.date, siteId });
  assert.equal(activity.shifts.length, 1);
  assert.equal(activity.patrols.length, 1);
  console.log('PASS ERP activity view lists the shift and patrol for the site/day');

  await mongoose.connection.db!.dropDatabase();
  console.log('ALL SHIFT CHECKS PASSED');
}

main()
  .catch(async (err) => {
    console.error('SHIFT CHECK FAILED:', err);
    process.exitCode = 1;
    try { await mongoose.connection.db?.dropDatabase(); } catch { /* connection may be gone */ }
  })
  .finally(() => mongoose.disconnect());
