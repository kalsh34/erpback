import { Request, Response, NextFunction } from 'express';
import { ProformaCompanyService, MarketingCtx } from './company.service';

function ctx(req: Request): MarketingCtx {
  return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}

export class ProformaCompanyController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaCompanyService.getAll({
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: req.query.search as string,
        status: req.query.status as string,
        sort: req.query.sort as string,
        dir: req.query.dir as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaCompanyService.getDetail(req.params.id);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaCompanyService.create(req.body, ctx(req));
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaCompanyService.update(req.params.id, req.body, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaCompanyService.deactivate(req.params.id, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
