import app from './app';
import { config } from './config/env';
import { connectDatabase } from './config/database';
import { ensureDefaultAdmin } from './bootstrap/ensureDefaultAdmin';
import { registerHRPermissions } from './modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from './modules/hr/permissions/payroll.permissions';
import { registerCorePermissions } from './core/permissions/core.permissions';

const registerAllPermissions = () => {
  registerCorePermissions();
  registerHRPermissions();
  registerPayrollPermissions();
  console.log('[PERMISSIONS] All module permissions registered');
};

const start = async () => {
  try {
    await connectDatabase();
    await ensureDefaultAdmin();
    registerAllPermissions();
    app.listen(config.port, () => {
      console.log(`[SERVER] Running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start:', error);
    process.exit(1);
  }
};

start();
