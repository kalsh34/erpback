/**
 * QA RESET — deletes business/test data from 'vitalpayroll' while preserving:
 *   users (admin + logins), organizations, departments, positions,
 *   taxbrackets, pensionrules, guardpayrollconfigs,
 * and ALL indexes (deleteMany never drops indexes).
 * Verifies the result; aborts if the backup folder does not exist.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const PRESERVE = new Set([
  'users', 'organizations', 'departments', 'positions',
  'taxbrackets', 'pensionrules', 'guardpayrollconfigs',
]);

(async () => {
  const latest = fs
    .readdirSync('backup')
    .filter((d) => d.startsWith('vitalpayroll-'))
    .sort()
    .pop();
  const manifestPath = `backup/${latest}/_manifest.json`;
  if (!latest || !fs.existsSync(manifestPath)) throw new Error('No verified backup found — aborting reset');
  const backup = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`Using backup: ${latest} (docs=${backup.totalDocs})`);

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();

  const wiped = [];
  for (const name of cols) {
    if (PRESERVE.has(name)) continue;
    const r = await db.collection(name).deleteMany({});
    wiped.push({ collection: name, deleted: r.deletedCount });
  }

  // Verify: every non-preserved collection is now empty; preserved counts unchanged.
  let ok = true;
  for (const name of cols) {
    const after = await db.collection(name).countDocuments();
    const expect = PRESERVE.has(name)
      ? backup.collections.find((c) => c.collection === name)?.count ?? 0
      : 0;
    if (after !== expect) {
      console.error(`VERIFY FAIL ${name}: expected ${expect}, got ${after}`);
      ok = false;
    }
  }
  const deletedTotal = wiped.reduce((s, w) => s + w.deleted, 0);
  console.log(`RESET ${ok ? 'VERIFIED' : 'FAILED'}: deleted ${deletedTotal} docs across ${wiped.length} collections`);
  console.log(`Preserved: ${[...PRESERVE].map((p) => `${p}=${wiped.length ? '' : ''}${backup.collections.find((c) => c.collection === p)?.count ?? 0}`).join(', ')}`);
  await mongoose.disconnect();
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error('RESET FAILED:', e.message); process.exit(1); });
