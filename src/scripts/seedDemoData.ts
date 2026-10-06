/**
 * DEMO DATA SEED — 20 guards + 20 office staff + one month of attendance,
 * then both payroll engines can be run for that month.
 *
 * Idempotent: re-running skips whatever already exists (keyed on employeeCode
 * prefix / periodKey) and only tops up what is missing.
 *
 *   npx ts-node --transpile-only src/scripts/seedDemoData.ts
 *
 * After seeding, run payroll for the month with:
 *   POST /api/staff-payroll/runs     { "periodKey": "2026-11" }
 *   POST /api/guard-payroll/runs     { "periodKey": "2026-11" }
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Employee } from '../models/Employee';
import { GuardProfile } from '../models/GuardProfile';
import { PrimarySiteAssignment } from '../models/PrimarySiteAssignment';
import { Contract } from '../models/Contract';
import { Site } from '../models/Site';
import { GuardMonthlyHours } from '../models/GuardMonthlyHours';
import { StaffAttendance } from '../models/StaffAttendance';
import { EmployeeCategory, EmployeeStatus, EmploymentType, GuardPosition, StaffAttendanceStatus } from '../types';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';

const GUARD_PREFIX = 'VSP-G'; // demo guards:  VSP-G01 … VSP-G20
const STAFF_PREFIX = 'VSP-S'; // demo staff:   VSP-S01 … VSP-S20
const PERIOD = { year: 2026, month: 11 }; // November 2026 — the demo month

/* Deterministic pseudo-random so re-runs reproduce the same demo numbers. */
let s = 987654321;
const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

const GUARD_NAMES: [string, string][] = [
  ['Getachew', 'Bekele'], ['Mulugeta', 'Assefa'], ['Tewodros', 'Girma'], ['Solomon', 'Haile'],
  ['Berhane', 'Mesfin'], ['Kassahun', 'Alemu'], ['Endale', 'Tsegaye'], ['Fikadu', 'Kebede'],
  ['Alemayehu', 'Worku'], ['Dereje', 'Bekele'], ['Hailu', 'Mekonnen'], ['Girma', 'Wolde'],
  ['Tesfaye', 'Jiru'], ['Mekonnen', 'Hailu'], ['Wondimu', 'Gebre'], ['Zerihun', 'Alemu'],
  ['Tadesse', 'Ayele'], ['Bekele', 'Negash'], ['Ashenafi', 'Girma'], ['Yohannes', 'Abera'],
];

const STAFF_NAMES: [string, string][] = [
  ['Sara', 'Abebe'], ['Liya', 'Girma'], ['Hanna', 'Tesfaye'], ['Ruth', 'Alemu'],
  ['Bethel', 'Tadesse'], ['Meron', 'Haile'], ['Eyerusalem', 'Kebede'], ['Selam', 'Bekele'],
  ['Genet', 'Mekonnen'], ['Tsion', 'Worku'], ['Kirubel', 'Assefa'], ['Nahom', 'Gebre'],
  ['Samuel', 'Terefe'], ['Yonatan', 'Alemu'], ['Nathan', 'Wolde'], ['Elias', 'Girma'],
  ['Dawit', 'Fikru'], ['Abel', 'Mulugeta'], ['Kalkidan', 'Tsegaye'], ['Mahlet', 'Ayele'],
];

const POSITIONS = ['Accountant', 'HR Officer', 'Admin Assistant', 'Procurement Officer', 'Secretary', 'IT Support', 'Finance Officer', 'Logistics'];

async function seedDemoData() {
  await mongoose.connect(MONGODB_URI);
  console.log('[DEMO] Connected to MongoDB');
  // Attendance rows reference the recording user; the demo uses a fixed
  // system ObjectId (no need for a real login).
  const SYSTEM_USER = new mongoose.Types.ObjectId('0000000000000000000000aa');
  const now = new Date();

  const daysInMonth = new Date(PERIOD.year, PERIOD.month, 0).getDate();
  const periodKey = `${PERIOD.year}-${String(PERIOD.month).padStart(2, '0')}`;

  /* ── Sites ─────────────────────────────────────────────────────────── */
  const sites = await Site.find({}).lean();
  if (sites.length === 0) throw new Error('No sites found — run the base seed first');
  const activeSites = sites.filter((s: any) => s.status !== 'INACTIVE');
  console.log(`[DEMO] Sites available: ${activeSites.map((s: any) => s.siteName).join(', ')}`);

  /* ── 20 guards ─────────────────────────────────────────────────────── */
  let guardsCreated = 0;
  for (let i = 1; i <= 20; i++) {
    const code = `${GUARD_PREFIX}${String(i).padStart(2, '0')}`;
    const [first, last] = GUARD_NAMES[i - 1];
    const exists = await Employee.findOne({ employeeCode: code });
    if (exists) continue;

    const emp = await Employee.create({
      employeeCode: code,
      firstName: first,
      lastName: last,
      category: EmployeeCategory.GUARD,
      status: EmployeeStatus.CONTRACTED, // CONTRACTED guards are picked up by guard payroll
      hireDate: new Date('2024-03-01'),
      phone: `0911${String(200000 + i).slice(-6)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\//g, '')}.g${i}@demo.vitalpayroll.com`,
      guardInfo: { employmentType: EmploymentType.CONTRACT, idCardNumber: `ID-G${String(i).padStart(3, '0')}` },
    });
    await GuardProfile.create({
      employeeId: emp._id,
      position: GuardPosition.GUARD,
      employmentType: 'CONTRACT',
      rate: 30 + Math.floor(rnd() * 21), // 30–50 ETB/h
      transportAllowance: Math.floor(rnd() * 401) + 100,
    });
    // Site assignment — round-robin across the active sites, first assignment is primary
    const site = activeSites[(i - 1) % activeSites.length];
    await PrimarySiteAssignment.create({
      guardId: emp._id,
      siteId: site._id,
      role: 'GUARD',
      isPrimary: true,
      standardMonthlyHours: 240,
      hourlyRate: 30 + Math.floor(rnd() * 21),
      transportAllowance: 100 + Math.floor(rnd() * 401),
      effectiveFrom: new Date('2026-01-01'),
      isCurrent: true,
    });
    guardsCreated++;
  }
  console.log(`[DEMO] Guards created: ${guardsCreated} (20 requested)`);

  /* ── 20 office staff ───────────────────────────────────────────────── */
  let staffCreated = 0;
  for (let i = 1; i <= 20; i++) {
    const code = `${STAFF_PREFIX}${String(i).padStart(2, '0')}`;
    const [first, last] = STAFF_NAMES[i - 1];
    const exists = await Employee.findOne({ employeeCode: code});
    if (exists) continue;

    const position = POSITIONS[i % POSITIONS.length];
    const wage = 4000 + i * 450; // 4,450 … 13,450
    const emp = await Employee.create({
      employeeCode: code,
      firstName: first,
      lastName: last,
      category: EmployeeCategory.OFFICE_STAFF,
      status: EmployeeStatus.ACTIVE,
      hireDate: new Date('2023-08-01'),
      phone: `0922${String(300000 + i).slice(-6)}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\//g, '')}.s${i}@demo.vitalpayroll.com`,
      position,
      salary: wage,
    });
    // Staff payroll includes only employees with an ACTIVE contract covering the period
    await Contract.create({
      employeeId: emp._id,
      contractStartDate: new Date('2026-01-01'),
      contractType: 'Full-Time',
      jobPosition: position,
      wage,
      responsibilityAllowance: 300 + i * 30, // 330 … 930
      teleAllowance: 100 + (i % 5) * 50, // 100 … 300
      taxableTransport: 200 + (i % 4) * 150, // 200 … 650
      nonTaxableAllowance: 300 + (i % 6) * 100, // 300 … 800
      transportAllowance: 0,
      pensionEnrolled: true,
      status: 'ACTIVE',
    });
    staffCreated++;
  }
  console.log(`[DEMO] Staff created: ${staffCreated} (20 requested)`);

  /* ── Guard attendance: one monthly sheet per guard×site for Nov 2026 ── */
  const guardAssignments = await PrimarySiteAssignment.find({ isCurrent: true }).lean();
  let sheets = 0;
  for (const a of guardAssignments) {
    const guard: any = await Employee.findById(a.guardId);
    if (!guard || guard.category !== EmployeeCategory.GUARD) continue;
    const existing = await GuardMonthlyHours.findOne({ guardId: a.guardId, siteId: a.siteId, periodKey });
    if (existing) continue;

    // Realistic 12h-duty pattern: 20–26 duty days → 240–312h.
    const normalHours = 240 + Math.floor(rnd() * 73);
    const sundayHours = rnd() > 0.4 ? 12 * (1 + Math.floor(rnd() * 2)) : 0; // 12 or 24
    const holidayHours = rnd() > 0.8 ? 12 : 0;
    const changedAt = new Date();
    await GuardMonthlyHours.create({
      guardId: a.guardId,
      siteId: a.siteId,
      periodKey,
      normalHours,
      sundayHours,
      holidayHours,
      source: 'HR_MANUAL',
      recordedBy: SYSTEM_USER,
      updatedBy: SYSTEM_USER,
      changeHistory: [{
        previous: { normalHours: 0, holidayHours: 0, sundayHours: 0 },
        new: { normalHours, holidayHours, sundayHours },
        changedBy: SYSTEM_USER,
        changedAt,
      }],
    } as any);
    sheets++;
  }
  console.log(`[DEMO] Guard monthly-hours sheets created: ${sheets} for ${periodKey}`);

  /* ── Staff attendance: most days present, a few absences ───────────── */
  const staffList = await Employee.find({ employeeCode: { $regex: `^${STAFF_PREFIX}` } });
  let staffDays = 0;
  for (const emp of staffList) {
    const existing = await StaffAttendance.findOne({ employeeId: emp._id, periodKey });
    if (existing) continue; // already marked for this month
    const docs: any[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const roll = rnd();
      const status = roll > 0.97 ? StaffAttendanceStatus.ABSENT : StaffAttendanceStatus.PRESENT;
      docs.push({
        employeeId: emp._id,
        periodKey,
        date: `${periodKey}-${String(d).padStart(2, '0')}`,
        dayOfMonth: d,
        status,
        recordedBy: SYSTEM_USER,
      });
    }
    await StaffAttendance.insertMany(docs);
    staffDays += docs.length;
  }
  console.log(`[DEMO] Staff attendance rows created: ${staffDays} for ${periodKey}`);

  console.log('\n[DEMO] Done. Next: create the payroll runs for', periodKey);
  await mongoose.disconnect();
  process.exit(0);
}

seedDemoData().catch((e) => {
  console.error('[DEMO] Failed:', e);
  process.exit(1);
});
