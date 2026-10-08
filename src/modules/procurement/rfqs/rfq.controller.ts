import { Request, Response, NextFunction } from 'express';
import { RFQService } from './rfq.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class RFQController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, supplierId, buyerId, search, sort, dir } = req.query;
      const result = await RFQService.getAll({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        supplierId: supplierId as string,
        buyerId: buyerId as string,
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
      const result = await RFQService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await RFQService.create(req.body, {
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
      const result = await RFQService.update(req.params.id, req.body, {
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
      const result = await RFQService.submit(req.params.id, {
        userId: req.user?.userId,
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
      const result = await RFQService.send(req.params.id, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async recordQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { quotes } = req.body;
      const result = await RFQService.recordQuotation(req.params.id, quotes || [], {
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
      const result = await RFQService.approve(req.params.id, {
        userId: req.user?.userId,
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
      const { reason } = req.body;
      const result = await RFQService.reject(req.params.id, reason || 'Rejected by buyer', {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async convertToPO(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await RFQService.convertToPO(req.params.id, req.body, {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async compare(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RFQService.compareQuotations();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
