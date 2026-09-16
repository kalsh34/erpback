"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const hr_permissions_1 = require("./modules/hr/permissions/hr.permissions");
const payroll_permissions_1 = require("./modules/hr/permissions/payroll.permissions");
const core_permissions_1 = require("./core/permissions/core.permissions");
const registerAllPermissions = () => {
    (0, core_permissions_1.registerCorePermissions)();
    (0, hr_permissions_1.registerHRPermissions)();
    (0, payroll_permissions_1.registerPayrollPermissions)();
    console.log('[PERMISSIONS] All module permissions registered');
};
const start = async () => {
    try {
        await (0, database_1.connectDatabase)();
        registerAllPermissions();
        app_1.default.listen(env_1.config.port, () => {
            console.log(`[SERVER] Running on port ${env_1.config.port} in ${env_1.config.nodeEnv} mode`);
        });
    }
    catch (error) {
        console.error('[SERVER] Failed to start:', error);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=server.js.map