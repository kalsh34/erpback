"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCorePermissions = registerCorePermissions;
const registry_1 = require("./registry");
const types_1 = require("../../types");
function registerCorePermissions() {
    (0, registry_1.registerModule)({
        module: 'core',
        permissions: [
            types_1.PERMISSIONS.USER_CREATE,
            types_1.PERMISSIONS.USER_READ,
            types_1.PERMISSIONS.USER_UPDATE,
            types_1.PERMISSIONS.USER_DELETE,
            types_1.PERMISSIONS.REPORT_READ,
            types_1.PERMISSIONS.AUDIT_READ,
            types_1.PERMISSIONS.SETTINGS_READ,
            types_1.PERMISSIONS.SETTINGS_UPDATE,
            types_1.PERMISSIONS.PAYROLL_PERIOD_READ,
        ],
        roleDefaults: {
            [types_1.UserRole.SYSTEM_ADMIN]: [
                types_1.PERMISSIONS.USER_CREATE,
                types_1.PERMISSIONS.USER_UPDATE,
                types_1.PERMISSIONS.USER_READ,
                types_1.PERMISSIONS.SETTINGS_READ,
                types_1.PERMISSIONS.SETTINGS_UPDATE,
                types_1.PERMISSIONS.AUDIT_READ,
            ],
            [types_1.UserRole.HR_ADMIN]: [
                types_1.PERMISSIONS.USER_READ,
                types_1.PERMISSIONS.REPORT_READ,
                types_1.PERMISSIONS.SETTINGS_READ,
            ],
            [types_1.UserRole.OPERATIONS]: [
                types_1.PERMISSIONS.REPORT_READ,
                types_1.PERMISSIONS.PAYROLL_PERIOD_READ,
            ],
        },
    });
}
//# sourceMappingURL=core.permissions.js.map