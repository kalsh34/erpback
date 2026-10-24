import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import app from '../src/app';
import { ensureDefaultAdmin } from '../src/bootstrap/ensureDefaultAdmin';
import { registerCorePermissions } from '../src/core/permissions/core.permissions';
import { registerHRPermissions } from '../src/modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from '../src/modules/hr/permissions/payroll.permissions';

async function main() {
  const uri = 'mongodb://127.0.0.1:27029/guard_e2e_20261012?replicaSet=guardE2e';
  await mongoose.connect(uri);
  await ensureDefaultAdmin();
  registerCorePermissions();
  registerHRPermissions();
  registerPayrollPermissions();
  // Build unique indexes before accepting requests, just as production deployment should.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  fs.mkdirSync(path.resolve('../.guard-e2e'), { recursive: true });
  fs.writeFileSync(path.resolve('../.guard-e2e/api.pid'), String(process.pid));
  const server = app.listen(5019, '127.0.0.1', () => {
    console.log(`Guard E2E API ready: http://127.0.0.1:5019; database guard_e2e_20261012; PID ${process.pid}`);
  });
  server.on('error', async (error) => { console.error(error); await mongoose.disconnect(); process.exitCode = 1; });
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
