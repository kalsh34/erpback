import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../common/ApiError';
import { UserRole, ROLE_PERMISSIONS, Permission } from '../types';
import { getRolePermissions } from '../core/permissions/registry';

export const authorize = (...allowedPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const userRole = req.user.role as UserRole;
    const hardcodedPerms = ROLE_PERMISSIONS[userRole] || [];
    const registeredPerms = getRolePermissions(userRole);
    const userPermissions = [...new Set([...hardcodedPerms, ...registeredPerms])];

    const hasPermission = allowedPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }

    next();
  };
};
