import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../types';
export declare const authorize: (...allowedPermissions: Permission[]) => (req: Request, _res: Response, next: NextFunction) => void;
/**
 * EFFECTIVE per-user permissions: the role's defaults (role map + module
 * registry), PLUS every module the admin granted the user, MINUS every module
 * the admin denied. Denies always win over grants and role defaults.
 */
export declare function computeEffectivePermissions(user: {
    role: UserRole;
    moduleGrants?: string[] | null;
    moduleDenies?: string[] | null;
}): Permission[];
/** Union of the hardcoded role map and the module registry (same rule `authorize` uses). */
export declare function getPermissionsForRole(role: UserRole): Permission[];
/** Programmatic permission check (used for configurable rules such as
 *  GUARD_ATTENDANCE_FUTURE — advance attendance entry). */
export declare function hasPermission(role: UserRole, permission: Permission): boolean;
//# sourceMappingURL=rbac.d.ts.map