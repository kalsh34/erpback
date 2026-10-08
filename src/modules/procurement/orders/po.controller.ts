import { Request, Response, NextFunction } from 'express';
import { POService } from './po.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class POController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, supplierId, buyerId, department, search, sort, dir } = req.query;
      const result = await POService.getAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        supplierId: supplierId as string,
        buyerId: buyerId as string,
        department: department as string,
        search: search as string,
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
      const result = await POService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await POService.create(req.body, {
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
      const result = await POService.update(req.params.id, req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await POService.submit(req.params.id, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { comments } = req.body;
      const result = await POService.approve(req.params.id, comments, {
        userId: req.user?.userId,
        userRole: req.user?.role,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { comments } = req.body;
      const result = await POService.reject(req.params.id, comments || 'Rejected by approver', {
        userId: req.user?.userId,
        userRole: req.user?.role,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async send(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await POService.send(req.params.id, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async revise(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await POService.revise(req.params.id, req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
