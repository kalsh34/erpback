import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class ProductController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, type, category, supplierId, lowStock, status, sort, dir } = req.query;
      const result = await ProductService.getAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        type: type as string,
        category: category as string,
        supplierId: supplierId as string,
        lowStock: lowStock as string,
        status: status as string,
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
      const result = await ProductService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.create(req.body, {
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
      const result = await ProductService.update(req.params.id, req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ProductService.delete(req.params.id, {
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
