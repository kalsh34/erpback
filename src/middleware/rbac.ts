import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/ApiError';
import { UserRole, ROLE_PERMISSIONS, Permission, MODULE_ACCESS } from '../types';
import { getRolePermissions } from '../core/permissions/registry';

export const authorize = (...allowedPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    // authenticate() attaches the EFFECTIVE per-user permissions (role defaults
    // + module grants − module denies). Fall back to the role map for callers
    // that bypass authenticate().
    const userPermissions = req.user.permissions ?? getPermissionsForRole(req.user.role as UserRole);
    const hasPermission = allowedPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

/**
 * EFFECTIVE per-user permissions: the role's defaults (role map + module
 * registry), PLUS every module the admin granted the user, MINUS every module
 * the admin denied. Denies always win over grants and role defaults.
 */
export function computeEffectivePermissions(user: {
  role: UserRole;
  moduleGrants?: string[] | null;
  moduleDenies?: string[] | null;
}): Permission[] {
  const set = new Set<Permission>(getPermissionsForRole(user.role));
  for (const key of user.moduleGrants ?? []) {
    const mod = MODULE_ACCESS.find((m) => m.key === key);
    if (mod) mod.permissions.forEach((p) => set.add(p));
  }
  for (const key of user.moduleDenies ?? []) {
    const mod = MODULE_ACCESS.find((m) => m.key === key);
    if (mod) mod.permissions.forEach((p) => set.delete(p));
  }
  return [...set];
}

/** Union of the hardcoded role map and the module registry (same rule `authorize` uses). */
export function getPermissionsForRole(role: UserRole): Permission[] {
  const hardcodedPerms = ROLE_PERMISSIONS[role] || [];
  const registeredPerms = getRolePermissions(role);
  return [...new Set([...hardcodedPerms, ...registeredPerms])];
}

/** Programmatic permission check (used for configurable rules such as
 *  GUARD_ATTENDANCE_FUTURE — advance attendance entry). */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}
