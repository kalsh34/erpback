"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPayrollPermissions = registerPayrollPermissions;
const registry_1 = require("../../../core/permissions/registry");
const types_1 = require("../../../types");
function registerPayrollPermissions() {
    (0, registry_1.registerModule)({
        module: 'payroll',
        permissions: [
            types_1.PERMISSIONS.GUARD_PAYROLL_READ,
            types_1.PERMISSIONS.GUARD_PAYROLL_RATES,
            types_1.PERMISSIONS.GUARD_PAYROLL_CALCULATE,
            types_1.PERMISSIONS.GUARD_PAYROLL_CHECK,
            types_1.PERMISSIONS.GUARD_PAYROLL_APPROVE,
            types_1.PERMISSIONS.GUARD_PAYROLL_PAY,
            types_1.PERMISSIONS.GUARD_PAYROLL_RETURN,
            types_1.PERMISSIONS.OFFICE_PAYROLL_CREATE,
            types_1.PERMISSIONS.OFFICE_PAYROLL_CALCULATE,
            types_1.PERMISSIONS.OFFICE_PAYROLL_SUBMIT,
            types_1.PERMISSIONS.OFFICE_PAYROLL_CHECK,
            types_1.PERMISSIONS.OFFICE_PAYROLL_ENTER_OT,
            types_1.PERMISSIONS.OFFICE_PAYROLL_RETURN,
            types_1.PERMISSIONS.OFFICE_PAYROLL_RATES,
            types_1.PERMISSIONS.OFFICE_PAYROLL_APPROVE,
            types_1.PERMISSIONS.OFFICE_PAYROLL_PAY,
        ],
        roleDefaults: {
            [types_1.UserRole.HR_ADMIN]: [
                types_1.PERMISSIONS.GUARD_PAYROLL_READ,
                types_1.PERMISSIONS.OFFICE_PAYROLL_CREATE,
            ],
            [types_1.UserRole.OPERATIONS]: [
                types_1.PERMISSIONS.GUARD_PAYROLL_READ,
            ],
            [types_1.UserRole.GUARD]: [
                types_1.PERMISSIONS.GUARD_PAYROLL_READ,
            ],
        },
    });
}
//# sourceMappingURL=payroll.permissions.js.map