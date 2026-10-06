/**
 * ONE-TIME cleanup for the payroll v2 cutover.
 *
 * 1. Deletes every legacy payroll collection (records, runs, config, rates,
 *    loans, journal, approvals, 26th→25th periods).
 * 2. Migrates attendance keys from payrollPeriodId → calendar-month periodKey:
 *      • guardattendancerecords  (periodKey = YYYY-MM of `date`)
 *      • guardmonthlyhours       (periodKey already set; drop payrollPeriodId)
 *      • staff_attendance_v2     (periodKey = YYYY-MM of `date`)
 *
 * Run:  node scripts/cleanup-payroll-v1.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';

const DROP_COLLECTIONS = [
  'guardpayrollrecords',
  'staffpayrollrecords',
  'payrollruns',
  'payrollformulaversions',
  'salarystructures',
  'salarycomponents',
  'taxbrackets',
  'pensionrules',
  'payrollrates',
  'loans',
  'guardsiterates',
  'journalentries',
  'payrollapprovals',
  'payrollperiods',
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('[cleanup] connected to', MONGODB_URI);
  const db = mongoose.connection.db;

  for (const name of DROP_COLLECTIONS) {
    const exists = await db.listCollections({ name }).hasNext();
    if (!exists) {
      console.log(`[drop] ${name}: not present, skipped`);
      continue;
    }
    const res = await db.collection(name).deleteMany({});
    console.log(`[drop] ${name}: deleted ${res.deletedCount} document(s)`);
  }

  // Legacy indexes block the periodKey migration (null payrollPeriodId dupes).
  const LEGACY_INDEXES = [
    ['staff_attendance_v2', ['employeeId_1_payrollPeriodId_1_dayOfMonth_1', 'payrollPeriodId_1']],
    ['guardattendancerecords', ['payrollPeriodId_1_guardId_1']],
  ];
  for (const [coll, indexes] of LEGACY_INDEXES) {
    for (const idx of indexes) {
      try {
        await db.collection(coll).dropIndex(idx);
        console.log(`[index] dropped ${coll} ${idx}`);
      } catch (e) {
        console.log(`[index] skip ${coll} ${idx}`);
      }
    }
  }

  // Attendance keys → calendar month
  const guardAtt = db.collection('guardattendancerecords');
  const r1 = await guardAtt.updateMany(
    { periodKey: { $exists: false }, date: { $type: 'string', $gte: '0000-01-01' } },
    [{ $set: { periodKey: { $substrCP: ['$date', 0, 7] } } }]
  );
  const r1b = await guardAtt.updateMany({ payrollPeriodId: { $exists: true } }, { $unset: { payrollPeriodId: '' } });
  console.log(`[migrate] guardattendancerecords: periodKey set on ${r1.modifiedCount}, payrollPeriodId removed on ${r1b.modifiedCount}`);

  const monthly = db.collection('guardmonthlyhours');
  const r2 = await monthly.updateMany({ payrollPeriodId: { $exists: true } }, { $unset: { payrollPeriodId: '' } });
  console.log(`[migrate] guardmonthlyhours: payrollPeriodId removed on ${r2.modifiedCount}`);

  const staffAtt = db.collection('staff_attendance_v2');
  const r3 = await staffAtt.updateMany(
    { periodKey: { $exists: false }, date: { $type: 'string', $gte: '0000-01-01' } },
    [{ $set: { periodKey: { $substrCP: ['$date', 0, 7] } } }]
  );
  const r3b = await staffAtt.updateMany({ payrollPeriodId: { $exists: true } }, { $unset: { payrollPeriodId: '' } });
  console.log(`[migrate] staff_attendance_v2: periodKey set on ${r3.modifiedCount}, payrollPeriodId removed on ${r3b.modifiedCount}`);

  await mongoose.disconnect();
  console.log('[cleanup] done');
  process.exit(0);
}

main().catch((err) => {
  console.error('[cleanup] FAILED:', err);
  process.exit(1);
});
