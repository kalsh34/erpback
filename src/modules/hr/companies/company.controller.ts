import { Request, Response, NextFunction } from 'express';
import { CompanyService } from './company.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class CompanyController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, search, sort, dir } = req.query;
      const result = await CompanyService.getAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        status: status as string,
        search: search as string,
        sort: sort as string,
        dir: dir as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const company = await CompanyService.getById(req.params.id);
      res.json({ success: true, data: company });
    } catch (error) { next(error); }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await CompanyService.getDetail(req.params.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await CompanyService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: company });
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const company = await CompanyService.update(req.params.id, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: company });
    } catch (error) { next(error); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await CompanyService.delete(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, message: 'Company deactivated' });
    } catch (error) { next(error); }
  }
}
