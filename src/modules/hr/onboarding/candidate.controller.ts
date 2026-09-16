import { Request, Response, NextFunction } from 'express';
import { CandidateService } from './candidate.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class CandidateController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { stage, page, limit } = req.query;
      const result = await CandidateService.getAll({
        stage: stage as string,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 50,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.getById(req.params.id);
      res.json({ success: true, data: candidate });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const candidate = await CandidateService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: candidate });
    } catch (error) { next(error); }
  }

  static async updateStage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { stage, notes } = req.body;
      const candidate = await CandidateService.updateStage(req.params.id, stage, notes, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: candidate });
    } catch (error) { next(error); }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const candidate = await CandidateService.reject(req.params.id, reason, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: candidate });
    } catch (error) { next(error); }
  }

  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await CandidateService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) { next(error); }
  }
}
