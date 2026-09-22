import { Request, Response, NextFunction } from 'express';
import { PayrollRunService } from './payrollRun.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class PayrollRunController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;
      const result = await PayrollRunService.getAll({
        status,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await PayrollRunService.getById(req.params.id);
      res.json({ success: true, data: run });
    } catch (error) { next(error); }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { name, runType, periodFrom, periodTo } = req.body;
      const run = await PayrollRunService.create(
        { name, runType, periodFrom, periodTo },
        { userId: req.user?.userId || '', ip: req.ip, ua: req.get('user-agent') }
      );
      res.status(201).json({ success: true, data: run });
    } catch (error) { next(error); }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const run = await PayrollRunService.approve(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: run });
    } catch (error) { next(error); }
  }

  static async markPaid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { paymentMethod, bankReference } = req.body || {};
      const run = await PayrollRunService.markPaid(
        req.params.id,
        { paymentMethod, bankReference },
        { userId: req.user?.userId || '', ip: req.ip, ua: req.get('user-agent') }
      );
      res.json({ success: true, data: run });
    } catch (error) { next(error); }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await PayrollRunService.remove(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, message: 'Payroll run deleted' });
    } catch (error) { next(error); }
  }
}