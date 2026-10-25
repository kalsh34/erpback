"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
exports.computeEffectivePermissions = computeEffectivePermissions;
exports.getMandatoryDeniedPermissions = getMandatoryDeniedPermissions;
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
        // authenticate() attaches the EFFECTIVE per-user permissions (role defaults
        // + module grants − module denies). Fall back to the role map for callers
        // that bypass authenticate().
        const userPermissions = req.user.permissions ?? getPermissionsForRole(req.user.role);
        const hasPermission = allowedPermissions.some((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            return next(ApiError_1.ApiError.forbidden('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
/**
 * EFFECTIVE per-user permissions: the role's defaults (role map + module
 * registry), PLUS every module the admin granted the user, MINUS every module
 * the admin denied. Denies always win over grants and role defaults.
 */
function computeEffectivePermissions(user) {
    const set = new Set(getPermissionsForRole(user.role));
    for (const key of user.moduleGrants ?? []) {
        const mod = types_1.MODULE_ACCESS.find((m) => m.key === key);
        if (mod)
            mod.permissions.forEach((p) => set.add(p));
    }
    for (const key of user.moduleDenies ?? []) {
        const mod = types_1.MODULE_ACCESS.find((m) => m.key === key);
        if (mod)
            mod.permissions.forEach((p) => set.delete(p));
    }
    // Module denies/grants only operate on whole-module bundles, so a single
    // bundle can mix permissions a role is meant to never hold (e.g. the
    // `company` bundle carries COMPANY_CREATE/COMPANY_UPDATE, which HR and
    // Finance roles must not regain). Mandatory exclusions therefore apply
    // LAST: no combination of grants or denies can ever restore them.
    for (const forbidden of getMandatoryDeniedPermissions(user.role)) {
        set.delete(forbidden);
    }
    return [...set];
}
/** Permissions the role is never allowed to hold, regardless of grants. */
function getMandatoryDeniedPermissions(role) {
    return types_1.ROLE_MANDATORY_DENIES[role] ?? [];
}
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