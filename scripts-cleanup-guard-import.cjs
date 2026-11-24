/**
 * Removes everything the guard-Excel import created (guards, their profile /
 * assignment / contract / guarantor rows, and the sites auto-created for them).
 * Only touches GUARD-category employees and the sites they point at.
 *
 * Usage: node scripts-cleanup-guard-import.cjs [--apply]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
const APPLY = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const guards = await db.collection('employees').find({ category: 'GUARD' }).project({ _id: 1, employeeCode: 1, homeSiteId: 1 }).toArray();
  const ids = guards.map((g) => g._id);
  const siteIds = [...new Set(guards.map((g) => g.homeSiteId).filter(Boolean).map(String))].map((s) => new mongoose.Types.ObjectId(s));

  const plan = {
    employees: ids.length,
    guardProfiles: await db.collection('guardprofiles').countDocuments({ employeeId: { $in: ids } }),
    primarySiteAssignments: await db.collection('primarysiteassignments').countDocuments({ guardId: { $in: ids } }),
    contracts: await db.collection('contracts').countDocuments({ employeeId: { $in: ids } }),
    guarantors: await db.collection('guarantors').countDocuments({ employeeId: { $in: ids } }),
    sites: siteIds.length,
  };
  console.log('To remove:', plan, 'codes', guards.length ? `${guards[0].employeeCode} … ${guards[guards.length - 1].employeeCode}` : '-');
  if (!APPLY) { await mongoose.disconnect(); return; }

  const r = {};
  r.guardprofiles = (await db.collection('guardprofiles').deleteMany({ employeeId: { $in: ids } })).deletedCount;
  r.primarysiteassignments = (await db.collection('primarysiteassignments').deleteMany({ guardId: { $in: ids } })).deletedCount;
  r.contracts = (await db.collection('contracts').deleteMany({ employeeId: { $in: ids } })).deletedCount;
  r.guarantors = (await db.collection('guarantors').deleteMany({ employeeId: { $in: ids } })).deletedCount;
  r.employees = (await db.collection('employees').deleteMany({ _id: { $in: ids } })).deletedCount;
  r.sites = (await db.collection('sites').deleteMany({ _id: { $in: siteIds } })).deletedCount;

  console.log('Deleted:', r);
  console.log('Remaining guards:', await db.collection('employees').countDocuments({ category: 'GUARD' }));
  console.log('Remaining sites:', await db.collection('sites').countDocuments({}));
  await mongoose.disconnect();
})();
