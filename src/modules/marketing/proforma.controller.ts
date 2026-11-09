import { Request, Response, NextFunction } from 'express';
import { ProformaService } from './proforma.service';
import type { MarketingCtx } from './company.service';

function ctx(req: Request): MarketingCtx {
  return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}

export class ProformaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.getAll({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string,
        status: req.query.status as string,
        companyId: req.query.companyId as string,
        from: req.query.from as string,
        to: req.query.to as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.create(req.body, ctx(req));
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.update(req.params.id, req.body, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.issue(req.params.id, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async setStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.setStatus(req.params.id, req.body?.status, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
