import { Request, Response, NextFunction } from 'express';
import { PayrollPeriodService } from './payrollPeriod.service';
import { FinanceService } from './finance.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class FinanceController {
  static async getAllPeriods(req: any, res: Response, next: NextFunction) {
    try {
      const { year, status } = req.query;
      const periods = await PayrollPeriodService.getAll({ year: parseInt(year), status });
      res.json({ success: true, data: periods });
    } catch (error) { next(error); }
  }

  static async getPeriodById(req: Request, res: Response, next: NextFunction) {
    try {
      const period = await PayrollPeriodService.getById(req.params.id);
      res.json({ success: true, data: period });
    } catch (error) { next(error); }
  }

  static async createPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const period = await PayrollPeriodService.create(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: period });
    } catch (error) { next(error); }
  }

  static async updatePeriodStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const period = await PayrollPeriodService.updateStatus(req.params.id, req.body.status, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: period });
    } catch (error) { next(error); }
  }

  static async lockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const period = await PayrollPeriodService.lock(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: period });
    } catch (error) { next(error); }
  }

  static async setRates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rates = await FinanceService.setPayrollRates(req.params.periodId, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: rates });
    } catch (error) { next(error); }
  }

  static async getRates(req: Request, res: Response, next: NextFunction) {
    try {
      const rates = await FinanceService.getPayrollRates(req.params.periodId);
      res.json({ success: true, data: rates });
    } catch (error) { next(error); }
  }
}
