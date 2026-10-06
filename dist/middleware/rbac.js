"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
exports.getPermissionsForRole = getPermissionsForRole;
exports.hasPermission = hasPermission;
const ApiError_1 = require("../common/ApiError");
const types_1 = require("../types");
const registry_1 = require("../core/permissions/registry");
const authorize = (...allowedPermissions) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(ApiError_1.ApiError.unauthorized());
        }
        const userPermissions = getPermissionsForRole(req.user.role);
        const hasPermission = allowedPermissions.some((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            return next(ApiError_1.ApiError.forbidden('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
/** Union of the hardcoded role map and the module registry (same rule `authorize` uses). */
function getPermissionsForRole(role) {
    const hardcodedPerms = types_1.ROLE_PERMISSIONS[role] || [];
    const registeredPerms = (0, registry_1.getRolePermissions)(role);
    return [...new Set([...hardcodedPerms, ...registeredPerms])];
}
/** Programmatic permission check (used for configurable rules such as
 *  GUARD_ATTENDANCE_FUTURE — advance attendance entry). */
function hasPermission(role, permission) {
    return getPermissionsForRole(role).includes(permission);
}
//# sourceMappingURL=rbac.js.map