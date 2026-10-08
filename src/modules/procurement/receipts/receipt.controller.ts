import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from './receipt.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class ReceiptController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, purchaseOrderId, supplierId, warehouse, search, sort, dir } = req.query;
      const result = await ReceiptService.getAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        purchaseOrderId: purchaseOrderId as string,
        supplierId: supplierId as string,
        warehouse: warehouse as string,
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
      const result = await ReceiptService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await ReceiptService.create(req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
