import { Request, Response, NextFunction } from 'express';
import { PerformanceService } from './performance.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class PerformanceController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { period, page, limit } = req.query;
      const result = await PerformanceService.getAll({
        period: period as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await PerformanceService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }

  static async getTopPerformers(_req: Request, res: Response, next: NextFunction) {
    try {
      const performers = await PerformanceService.getTopPerformers();
      res.json({ success: true, data: performers });
    } catch (error) { next(error); }
  }

  static async getReviewsDue(_req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await PerformanceService.getReviewsDue();
      res.json({ success: true, data: reviews });
    } catch (error) { next(error); }
  }

  static async createOrUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await PerformanceService.createOrUpdate(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) { next(error); }
  }
}
