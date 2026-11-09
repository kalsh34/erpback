import { Request, Response, NextFunction } from 'express';
import { ProformaSiteService } from './site.service';
import type { MarketingCtx } from './company.service';

function ctx(req: Request): MarketingCtx {
  return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}

export class ProformaSiteController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaSiteService.getAll({
        companyId: req.query.companyId as string,
        search: req.query.search as string,
        status: req.query.status as string,
        activeOnly: req.query.activeOnly as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaSiteService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaSiteService.create(req.body, ctx(req));
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaSiteService.update(req.params.id, req.body, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
