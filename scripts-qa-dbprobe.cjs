require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const td = JSON.parse(require('fs').readFileSync('.qa-testdata.json', 'utf8'));
  const s1 = td.employees.find((e) => e.code === 'QAS001');
  const rows = await db.collection('staff_attendance_v2').find({ employeeId: new mongoose.Types.ObjectId(s1.id), dayOfMonth: 2 }).toArray();
  console.log('rows for QAS001 day2:', rows.length);
  rows.forEach((r) => console.log(String(r._id), r.status, r.date, r.source));

  const all = await db.collection('staff_attendance_v2').aggregate([{ $group: { _id: '$employeeId', n: { $sum: 1 } } }]).toArray();
  console.log('per-employee counts:', all.map((a) => String(a._id) + ':' + a.n).join(', '));

  const dupQuery = await db.collection('staff_attendance_v2').aggregate([
    { $group: { _id: { employeeId: '$employeeId', day: '$dayOfMonth', pk: '$periodKey' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]).toArray();
  console.log('duplicate (employee,day,period) groups:', dupQuery.length, dupQuery.slice(0, 5).map((g) => g._id.employeeId + '-' + g._id.day + ': x' + g.n).join(', '));

  const idx = await db.collection('staff_attendance_v2').indexes();
  console.log('indexes:', idx.map((i) => i.name).join(' | '));
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
