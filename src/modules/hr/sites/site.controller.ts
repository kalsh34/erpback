import { Request, Response, NextFunction } from 'express';
import { SiteService } from './site.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class SiteController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await SiteService.getAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        status: status as string,
        search: search as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const site = await SiteService.getById(req.params.id);
      res.json({ success: true, data: site });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const site = await SiteService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: site });
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const site = await SiteService.update(req.params.id, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: site });
    } catch (error) { next(error); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await SiteService.delete(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, message: 'Site deleted' });
    } catch (error) { next(error); }
  }
}
