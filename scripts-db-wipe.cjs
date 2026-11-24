/**
 * DB WIPE — deletes every document from every collection in the local
 * 'vitalpayroll' database, keeping collections and their indexes.
 *
 * Writes a JSON safety dump to ../.qa-artifacts/db-wipe-backup-<stamp> first.
 * Refuses to run against any database other than 'vitalpayroll'.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const EXPECTED_DB = 'vitalpayroll';

(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vitalpayroll';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (db.databaseName !== EXPECTED_DB) {
    throw new Error(`Refusing to wipe: connected to "${db.databaseName}", expected "${EXPECTED_DB}"`);
  }
  console.log(`DB: ${db.databaseName}`);

  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();

  // --- safety dump (undo aid, keeps the DB itself clean) ---
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', '.qa-artifacts', `db-wipe-backup-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: [], totalDocs: 0 };
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(backupDir, `${name}.json`), JSON.stringify(docs, null, 1));
    manifest.collections.push({ collection: name, docs: docs.length });
    manifest.totalDocs += docs.length;
  }
  fs.writeFileSync(path.join(backupDir, '_manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Backup: ${backupDir} (${manifest.totalDocs} docs / ${collections.length} collections)`);

  // --- wipe ---
  let deleted = 0;
  for (const name of collections) {
    const r = await db.collection(name).deleteMany({});
    deleted += r.deletedCount;
  }

  // --- verify ---
  let remaining = 0;
  const leftovers = [];
  for (const name of collections) {
    const c = await db.collection(name).countDocuments();
    remaining += c;
    if (c) leftovers.push(`${name}=${c}`);
  }
  console.log(`Deleted ${deleted} docs across ${collections.length} collections.`);
  console.log(`Remaining docs: ${remaining}${leftovers.length ? ` (${leftovers.join(', ')})` : ''}`);

  const idx = [];
  for (const name of collections) idx.push(`${name}:${(await db.collection(name).indexes()).length}`);
  console.log(`Indexes kept: ${idx.join(' ')}`);

  await mongoose.disconnect();
  process.exit(remaining === 0 ? 0 : 1);
})().catch((e) => {
  console.error('WIPE FAILED:', e.message);
  process.exit(1);
});
