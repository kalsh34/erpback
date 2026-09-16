"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const ApiError_1 = require("../common/ApiError");
const types_1 = require("../types");
const registry_1 = require("../core/permissions/registry");
const authorize = (...allowedPermissions) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(ApiError_1.ApiError.unauthorized());
        }
        const userRole = req.user.role;
        const hardcodedPerms = types_1.ROLE_PERMISSIONS[userRole] || [];
        const registeredPerms = (0, registry_1.getRolePermissions)(userRole);
        const userPermissions = [...new Set([...hardcodedPerms, ...registeredPerms])];
        const hasPermission = allowedPermissions.some((perm) => userPermissions.includes(perm));
        if (!hasPermission) {
            return next(ApiError_1.ApiError.forbidden('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=rbac.js.map