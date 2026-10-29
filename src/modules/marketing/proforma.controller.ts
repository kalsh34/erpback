import { Request, Response, NextFunction } from 'express';
import { ProformaService } from './proforma.service';

function ctx(req: Request) {
  return {
    userId: req.user?.userId,
    ip: req.ip,
    ua: req.get('user-agent'),
    // Effective per-user permissions (attached by authenticate()). The
    // service uses these for conditional checks the route gate cannot express
    // — e.g. line-discount changes additionally require PROFORMA_DISCOUNT.
    permissions: req.user?.permissions ?? [],
  };
}

export class ProformaController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, status, companyId, sort, dir } = req.query;
      const result = await ProformaService.getAll({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        search: search as string,
        status: status as string,
        companyId: companyId as string,
        sort: sort as string,
        dir: dir as string,
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
      res.json({ success: true, data: result.proforma, superseded: result.superseded ?? null });
    } catch (error) {
      next(error);
    }
  }

  static async void(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.void_(req.params.id, ctx(req));
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async amend(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ProformaService.amend(req.params.id, ctx(req));
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
