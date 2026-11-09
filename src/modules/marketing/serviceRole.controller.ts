import { Request, Response, NextFunction } from 'express';
import { ServiceRoleService } from './serviceRole.service';
import type { MarketingCtx } from './company.service';

function ctx(req: Request): MarketingCtx {
  return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}

export class ServiceRoleController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ServiceRoleService.getAll({
        search: req.query.search as string,
        status: req.query.status as string,
        activeOnly: req.query.activeOnly as string,
        category: req.query.category as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ServiceRoleService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ServiceRoleService.create(req.body, ctx(req));
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ServiceRoleService.update(req.params.id, req.body, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
