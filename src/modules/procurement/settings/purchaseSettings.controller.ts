import { Request, Response, NextFunction } from 'express';
import { PurchaseSettingsService } from './purchaseSettings.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class PurchaseSettingsController {
  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseSettingsService.getSettings();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseSettingsService.updateSettings(req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
