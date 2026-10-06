import { Request, Response, NextFunction } from 'express';
import { AuditService } from './audit.service';

export class AuditController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { page, limit, entity, entityId, userId } = req.query;
      const result = await AuditService.getAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        entity,
        entityId: (entityId as string) || undefined,
        userId,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const log = await AuditService.getById(req.params.id);
      res.json({ success: true, data: log });
    } catch (error) { next(error); }
  }
}
