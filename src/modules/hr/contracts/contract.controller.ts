import { Request, Response, NextFunction } from 'express';
import { ContractService } from './contract.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class ContractController {
  static async getByEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await ContractService.getByEmployeeId(req.params.employeeId);
      res.json({ success: true, data: contract });
    } catch (error) { next(error); }
  }

  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, search } = req.query;
      const result = await ContractService.getAll({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        status: status as string,
        search: search as string,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const contract = await ContractService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: contract });
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const contract = await ContractService.update(req.params.id, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: contract });
    } catch (error) { next(error); }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await ContractService.delete(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, message: 'Contract deleted' });
    } catch (error) { next(error); }
  }
}
