import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { ApiError } from '../../common/ApiError';
import { AuthUser } from '../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.register(req.body);
      const userObj = user.toObject();
      const { password: _, ...userWithoutPassword } = userObj as any;
      res.status(201).json({ success: true, data: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const user = await AuthService.getMe(req.user.userId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.user.userId, currentPassword, newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const user = await AuthService.updateProfile(req.user.userId, req.body);
      const userObj = user.toObject();
      const { password: _, ...userWithoutPassword } = userObj as any;
      res.json({ success: true, data: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/auth/avatar — multipart upload, sets the caller's profile picture. */
  static async uploadAvatar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No image provided' });
        return;
      }
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await AuthService.updateProfile(req.user.userId, { avatarUrl });
      const userObj = user.toObject();
      const { password: _, ...userWithoutPassword } = userObj as any;
      res.status(201).json({ success: true, data: userWithoutPassword });
    } catch (error) {
      next(error);
    }
  }
}
