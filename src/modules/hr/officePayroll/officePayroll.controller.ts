import { Request, Response, NextFunction } from 'express';
import { StaffPayrollService } from './officePayroll.service';
import { PayrollCalculationService } from '../finance/payrollCalculation.service';
import { AuthUser } from '../../../middleware/auth';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class OfficePayrollController {
  static async getAll(req: any, res: Response, next: NextFunction) {
    try {
      const { payrollPeriodId, status, page, limit } = req.query;
      const result = await StaffPayrollService.getAll({
        payrollPeriodId, status,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.getById(req.params.id);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async generate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PayrollCalculationService.generateStaffPayrollRecords(req.params.periodId);
      if (req.user) {
        AuditService.log({
          userId: req.user.userId,
          action: 'OFFICE_PAYROLL_GENERATE',
          entity: 'StaffPayrollRecord',
          entityId: req.params.periodId,
          newValues: { count: result.records.length, skippedCount: result.skipped.length },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });
      }
      eventBus.emit('hr.officePayroll.recordsGenerated', { periodId: req.params.periodId, count: result.records.length });
      res.status(201).json({ success: true, data: result.records, skipped: result.skipped });
    } catch (error) { next(error); }
  }

  static async updateSalaryInputs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.updateSalaryInputs(req.params.id, req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async enterOt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.enterOt(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async calculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.calculate(req.params.id, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.submit(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async check(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.check(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.approve(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async initiatePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.initiatePayment(req.params.id, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async confirmPaid(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.confirmPaid(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip, ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async returnForCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffPayrollService.returnForCorrection(req.params.id, req.user?.userId || '', req.body.reason, {
        ip: req.ip, ua: req.get('user-agent'),
      }, req.user?.role);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }
}
