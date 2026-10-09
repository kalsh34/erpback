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
            types_1.PERMISSIONS.COMPANY_CREATE,
            types_1.PERMISSIONS.COMPANY_READ,
            types_1.PERMISSIONS.COMPANY_UPDATE,
            types_1.PERMISSIONS.GUARD_REGISTER,
            types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
            types_1.PERMISSIONS.GUARD_MODIFY_HOURS,
            types_1.PERMISSIONS.GUARD_ATTENDANCE_READ,
            types_1.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
            types_1.PERMISSIONS.GUARD_ATTENDANCE_FUTURE,
            types_1.PERMISSIONS.GUARD_ATTENDANCE_SELF,
            types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
            types_1.PERMISSIONS.ORGANIZATION_READ,
            types_1.PERMISSIONS.ORGANIZATION_MANAGE,
        ],
        roleDefaults: {
            [types_1.UserRole.HR_ADMIN]: [
                types_1.PERMISSIONS.EMPLOYEE_CREATE,
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.EMPLOYEE_UPDATE,
                types_1.PERMISSIONS.SITE_CREATE,
                types_1.PERMISSIONS.SITE_READ,
                types_1.PERMISSIONS.SITE_UPDATE,
                types_1.PERMISSIONS.COMPANY_CREATE,
                types_1.PERMISSIONS.COMPANY_READ,
                types_1.PERMISSIONS.COMPANY_UPDATE,
                types_1.PERMISSIONS.GUARD_REGISTER,
                types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_READ,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_FUTURE,
                types_1.PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
                types_1.PERMISSIONS.ORGANIZATION_READ,
                types_1.PERMISSIONS.ORGANIZATION_MANAGE,
            ],
            [types_1.UserRole.OPERATIONS]: [
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.SITE_READ,
                types_1.PERMISSIONS.COMPANY_READ,
                types_1.PERMISSIONS.GUARD_ASSIGN_SITE,
                types_1.PERMISSIONS.GUARD_MODIFY_HOURS,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_READ,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_MANAGE,
            ],
            [types_1.UserRole.GUARD]: [
                types_1.PERMISSIONS.EMPLOYEE_READ,
                types_1.PERMISSIONS.SITE_READ,
                types_1.PERMISSIONS.GUARD_ATTENDANCE_SELF,
            ],
        },
    });
}
//# sourceMappingURL=hr.permissions.js.map