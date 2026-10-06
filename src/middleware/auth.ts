import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { ApiError } from '../common/ApiError';
import { UserRole, Permission } from '../types';
import { User } from '../models/User';
import { computeEffectivePermissions } from './rbac';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  /** Effective per-user permissions (role defaults + module grants − denies). */
  permissions?: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUser;

    // Resolve the CURRENT user on every request: deactivated accounts are cut
    // off immediately and permission checks see fresh module grants/denies.
    const user = await User.findById(decoded.userId)
      .select('role isActive moduleGrants moduleDenies')
      .lean();
    if (!user) throw ApiError.unauthorized('User no longer exists');
    if (user.isActive === false) throw ApiError.forbidden('Account is deactivated');

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: user.role as UserRole,
      permissions: computeEffectivePermissions(user as any),
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid token'));
    }
  }
};
