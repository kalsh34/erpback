import { Request, Response, NextFunction } from 'express';
import { GuardPayrollService } from './guardPayroll.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class GuardPayrollController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { payrollPeriodId, status, page, limit } = req.query;
      const result = await GuardPayrollService.getAll({
        payrollPeriodId, status,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.getById(req.params.id);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async generateRecords(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const records = await GuardPayrollService.generateRecords(req.params.periodId, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: records });
    } catch (error) { next(error); }
  }

  static async enterOt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.enterOt(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async calculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.calculate(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.submit(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async check(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.check(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.approve(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async initiatePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.initiatePayment(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async confirmPaid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.confirmPaid(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async returnForCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.returnForCorrection(req.params.id, req.user?.userId || '', req.body.reason, {
        ip: req.ip, ua: req.get('user-agent'),
      }, req.user?.role);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async updateHours(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardPayrollService.updateHours(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }
}
