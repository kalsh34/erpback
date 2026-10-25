"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFleetPermissions = registerFleetPermissions;
const registry_1 = require("../../core/permissions/registry");
const types_1 = require("../../types");
/**
 * FLEET module permissions. FLEET_READ is the read surface for the module;
 * FLEET_MANAGE covers vehicles/maintenance/documents; FLEET_ASSIGN is the
 * narrower dispatch action (operator-level assignment of vehicles/driver).
 */
function registerFleetPermissions() {
    (0, registry_1.registerModule)({
        module: 'fleet',
        permissions: [
            types_1.PERMISSIONS.FLEET_READ,
            types_1.PERMISSIONS.FLEET_MANAGE,
            types_1.PERMISSIONS.FLEET_ASSIGN,
            types_1.PERMISSIONS.FLEET_REPORT,
        ],
        roleDefaults: {
            [types_1.UserRole.SUPER_ADMIN]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_MANAGE,
                types_1.PERMISSIONS.FLEET_ASSIGN,
                types_1.PERMISSIONS.FLEET_REPORT,
            ],
            [types_1.UserRole.SYSTEM_ADMIN]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_MANAGE,
                types_1.PERMISSIONS.FLEET_ASSIGN,
                types_1.PERMISSIONS.FLEET_REPORT,
            ],
            [types_1.UserRole.OPERATIONS]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_ASSIGN,
            ],
            [types_1.UserRole.FINANCE_OFFICER]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_REPORT,
            ],
            [types_1.UserRole.HR_ADMIN]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_ASSIGN,
            ],
            [types_1.UserRole.HEAD]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_REPORT,
            ],
            [types_1.UserRole.CEO]: [
                types_1.PERMISSIONS.FLEET_READ,
                types_1.PERMISSIONS.FLEET_REPORT,
            ],
            [types_1.UserRole.GUARD]: [],
        },
    });
}
//# sourceMappingURL=fleet.permissions.js.map