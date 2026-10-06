import { Request, Response, NextFunction } from 'express';
import { User } from '../../../models/User';
import { ApiError } from '../../../common/ApiError';
import { UserRole, MODULE_ACCESS } from '../../../types';
import { getPermissionsForRole } from '../../../middleware/rbac';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Keep only known module keys; undefined stays undefined (no change on update). */
function sanitizeModuleKeys(input: unknown): string[] | undefined {
  if (input === undefined) return undefined;
  if (!Array.isArray(input)) return [];
  const keys = input.filter((k): k is string => typeof k === 'string' && MODULE_ACCESS.some((m) => m.key === k));
  return [...new Set(keys)];
}

export class UserController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', role, search } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const filter: any = {};
      if (role) filter.role = role;
      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        User.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw ApiError.notFound('User not found');
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName, role, moduleGrants, moduleDenies } = req.body;
      const existing = await User.findOne({ email });
      if (existing) throw ApiError.conflict('Email already exists');

      const grants = sanitizeModuleKeys(moduleGrants);
      const denies = sanitizeModuleKeys(moduleDenies);

      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({ email, password: hashedPassword, firstName, lastName, role, moduleGrants: grants, moduleDenies: denies });

      AuditService.log({
        userId: req.user?.userId || '',
        action: 'USER_CREATE',
        entity: 'User',
        entityId: (user._id as any).toString(),
        newValues: { email, firstName, lastName, role, moduleGrants: grants, moduleDenies: denies },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      eventBus.emit('hr.user.created', { userId: user._id, role });

      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, role, email, moduleGrants, moduleDenies } = req.body;
      const old = await User.findById(req.params.id);
      if (!old) throw ApiError.notFound('User not found');
      const oldValues = { firstName: old.firstName, lastName: old.lastName, role: old.role, email: old.email, moduleGrants: old.moduleGrants, moduleDenies: old.moduleDenies };

      const grants = sanitizeModuleKeys(moduleGrants);
      const denies = sanitizeModuleKeys(moduleDenies);

      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          firstName,
          lastName,
          role,
          email,
          ...(grants !== undefined ? { moduleGrants: grants } : {}),
          ...(denies !== undefined ? { moduleDenies: denies } : {}),
        },
        { new: true, runValidators: true }
      );
      if (!user) throw ApiError.notFound('User not found');

      AuditService.log({
        userId: req.user?.userId || '',
        action: 'USER_UPDATE',
        entity: 'User',
        entityId: req.params.id,
        oldValues,
        newValues: { firstName, lastName, role, email, moduleGrants: grants, moduleDenies: denies },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      eventBus.emit('hr.user.updated', { userId: user._id });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) throw ApiError.notFound('User not found');

      AuditService.log({
        userId: req.user?.userId || '',
        action: 'USER_DELETE',
        entity: 'User',
        entityId: req.params.id,
        oldValues: { email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
      eventBus.emit('hr.user.deleted', { userId: req.params.id });

      res.json({ success: true, message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async activate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
      if (!user) throw ApiError.notFound('User not found');

      AuditService.log({
        userId: req.user?.userId || '',
        action: 'USER_ACTIVATE',
        entity: 'User',
        entityId: req.params.id,
        newValues: { isActive: true },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
      if (!user) throw ApiError.notFound('User not found');

      AuditService.log({
        userId: req.user?.userId || '',
        action: 'USER_DEACTIVATE',
        entity: 'User',
        entityId: req.params.id,
        newValues: { isActive: false },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async getRoles(_req: Request, res: Response) {
    // Same union the authorize() middleware enforces: hardcoded role map +
    // module-registered permissions, so the UI shows the EFFECTIVE grants.
    const roles = Object.values(UserRole).map((role) => ({
      role,
      permissions: getPermissionsForRole(role),
    }));
    res.json({ success: true, data: roles });
  }

  /**
   * The module-access catalog for grant/deny UIs: every module with its
   * permissions, so the admin sees exactly what a module switch toggles.
   */
  static async getModuleAccess(_req: Request, res: Response) {
    res.json({ success: true, data: MODULE_ACCESS });
  }
}
