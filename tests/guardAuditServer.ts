import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import app from '../src/app';

async function main() {
  const { uri, dbName } = JSON.parse(fs.readFileSync(path.resolve('../.guard-audit/database.json'), 'utf8'));
  if (!dbName.startsWith('guard_audit_') || !uri.startsWith('mongodb://127.0.0.1:27028/')) throw new Error('Refusing non-isolated database');
  await mongoose.connect(uri);
  app.listen(5018, '127.0.0.1', () => console.log(`Isolated audit API ready on 127.0.0.1:5018 (PID ${process.pid})`));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
