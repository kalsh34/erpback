import { Request, Response, NextFunction } from 'express';
import { ServiceLibraryService } from './serviceLibrary.service';
import { AuthUser } from '../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class ServiceLibraryController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, category, pricingModel, active, sort, dir } = req.query;
      const result = await ServiceLibraryService.getAll({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        search: search as string,
        category: category as string,
        pricingModel: pricingModel as string,
        active: active as string,
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
      const result = await ServiceLibraryService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ServiceLibraryService.create(req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ServiceLibraryService.update(req.params.id, req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ServiceLibraryService.deactivate(req.params.id, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async reactivate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ServiceLibraryService.reactivate(req.params.id, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
