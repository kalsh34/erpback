/**
 * QA BACKUP — dumps every collection of the configured database to
 * backup/<timestamp>/<collection>.json plus backup/<timestamp>/_indexes.json.
 * No credentials printed; all output is to disk. Verifies usability afterwards.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(process.cwd(), 'backup', `vitalpayroll-${ts}`);
  fs.mkdirSync(dir, { recursive: true });

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const manifest = [];
  const cols = (await db.listCollections().toArray()).map((c) => c.name).sort();
  for (const name of cols) {
    const docs = await db.collection(name).find({}, { strict: false }).toArray();
    const file = path.join(dir, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify({ collection: name, count: docs.length, docs }, null, 0));
    // verify: re-read the file, parse it, compare count
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.collection !== name || parsed.count !== docs.length || !Array.isArray(parsed.docs)) {
      throw new Error(`Backup verification FAILED for ${name}`);
    }
    manifest.push({ collection: name, count: docs.length, bytes: raw.length });
  }

  // Index definitions per collection
  const indexes = {};
  for (const name of cols) {
    indexes[name] = await db.collection(name).indexes();
  }
  fs.writeFileSync(path.join(dir, '_indexes.json'), JSON.stringify(indexes, null, 2));

  const totalDocs = manifest.reduce((s, m) => s + m.count, 0);
  fs.writeFileSync(path.join(dir, '_manifest.json'), JSON.stringify({ when: new Date().toISOString(), target: 'vitalpayroll', totalDocs, collections: manifest }, null, 2));
  console.log(`BACKUP OK -> ${dir}`);
  console.log(`collections=${manifest.length} totalDocs=${totalDocs}`);
  for (const m of manifest) if (m.count > 0) console.log(`  ${m.collection}: ${m.count}`);
  await mongoose.disconnect();
})().catch((e) => { console.error('BACKUP FAILED:', e.message); process.exit(1); });
