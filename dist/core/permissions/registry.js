"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerModule = registerModule;
exports.getAllPermissions = getAllPermissions;
exports.getRolePermissions = getRolePermissions;
exports.getRegisteredModules = getRegisteredModules;
const registeredModules = [];
function registerModule(config) {
    const existing = registeredModules.findIndex((m) => m.module === config.module);
    if (existing >= 0) {
        registeredModules[existing] = config;
    }
    else {
        registeredModules.push(config);
    }
}
function getAllPermissions() {
    const perms = new Set();
    for (const mod of registeredModules) {
        for (const p of mod.permissions) {
            perms.add(p);
        }
    }
    return Array.from(perms);
}
function getRolePermissions(role) {
    const perms = new Set();
    for (const mod of registeredModules) {
        const rolePerms = mod.roleDefaults[role];
        if (rolePerms) {
            for (const p of rolePerms) {
                perms.add(p);
            }
        }
    }
    return Array.from(perms);
}
function getRegisteredModules() {
    return [...registeredModules];
}
//# sourceMappingURL=registry.js.map