"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHRPermissions = registerHRPermissions;
const registry_1 = require("../../../core/permissions/registry");
const types_1 = require("../../../types");
function registerHRPermissions() {
    (0, registry_1.registerModule)({
        module: 'hr',
        permissions: [
            types_1.PERMISSIONS.EMPLOYEE_CREATE,
            types_1.PERMISSIONS.EMPLOYEE_READ,
            types_1.PERMISSIONS.EMPLOYEE_UPDATE,
            types_1.PERMISSIONS.EMPLOYEE_DELETE,
            types_1.PERMISSIONS.SITE_CREATE,
            types_1.PERMISSIONS.SITE_READ,
            types_1.PERMISSIONS.SITE_UPDATE,
            types_1.PERMISSIONS.GUARD_REGISTER,
            types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
            types_1.PERMISSIONS.GUARD_MODIFY_HOURS,
            types_1.PERMISSIONS.ATTENDANCE_READ,
            types_1.PERMISSIONS.ATTENDANCE_CLOCK,
            types_1.PERMISSIONS.ATTENDANCE_MANAGE,
            types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
        ],
        roleDefaults: {
            [types_1.UserRole.HR_ADMIN]: [
                types_1.PERMISSIONS.EMPLOYEE_CREATE,
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.EMPLOYEE_UPDATE,
                types_1.PERMISSIONS.SITE_CREATE,
                types_1.PERMISSIONS.SITE_READ,
                types_1.PERMISSIONS.SITE_UPDATE,
                types_1.PERMISSIONS.GUARD_REGISTER,
                types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
                types_1.PERMISSIONS.ATTENDANCE_READ,
                types_1.PERMISSIONS.ATTENDANCE_MANAGE,
                types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
            ],
            [types_1.UserRole.OPERATIONS]: [
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.SITE_READ,
                types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
                types_1.PERMISSIONS.GUARD_MODIFY_HOURS,
                types_1.PERMISSIONS.ATTENDANCE_READ,
            ],
            [types_1.UserRole.GUARD]: [
                types_1.PERMISSIONS.ATTENDANCE_CLOCK,
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.SITE_READ,
            ],
        },
    });
}
//# sourceMappingURL=hr.permissions.js.map