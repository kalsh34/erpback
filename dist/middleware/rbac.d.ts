import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../types';
export declare const authorize: (...allowedPermissions: Permission[]) => (req: Request, _res: Response, next: NextFunction) => void;
/** Union of the hardcoded role map and the module registry (same rule `authorize` uses). */
export declare function getPermissionsForRole(role: UserRole): Permission[];
/** Programmatic permission check (used for configurable rules such as
 *  GUARD_ATTENDANCE_FUTURE — advance attendance entry). */
export declare function hasPermission(role: UserRole, permission: Permission): boolean;
//# sourceMappingURL=rbac.d.ts.map