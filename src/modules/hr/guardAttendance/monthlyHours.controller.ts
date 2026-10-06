import { Request, Response, NextFunction } from 'express';
import { GuardMonthlyHoursService } from './monthlyHours.service';
import { AuthUser } from '../../../middleware/auth';
import { AttendanceSource } from '../../../types';
import { ApiError } from '../../../common/ApiError';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

function sourceFor(user?: AuthUser): AttendanceSource {
  return user?.role === ('OPERATIONS' as AuthUser['role'])
    ? AttendanceSource.OPERATIONS_EDIT
    : AttendanceSource.HR_MANUAL;
}

export class GuardMonthlyHoursController {
  /** GET /api/attendance/monthly-sheet?year=&month=&siteId= */
  static async getSheet(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month, siteId } = req.query;
      if (!year || !month) throw ApiError.badRequest('year and month are required');
      const data = await GuardMonthlyHoursService.getMonthlySheet(
        parseInt(year as string, 10),
        parseInt(month as string, 10),
        siteId ? (siteId as string) : undefined
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  /** POST /api/attendance/monthly-sheet */
  static async saveSheet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { year, month, entries } = req.body;
      if (!year || !month) throw ApiError.badRequest('year and month are required');
      const result = await GuardMonthlyHoursService.saveMonthly(
        {
          year: parseInt(year as string, 10),
          month: parseInt(month as string, 10),
          entries,
          userId: req.user?.userId || '',
          source: sourceFor(req.user),
        },
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.status(result.failed.length > 0 ? 207 : 201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** GET /api/attendance/monthly-sheet/payroll-hours?year=&month= */
  static async getPayrollHours(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;
      if (!year || !month) throw ApiError.badRequest('year and month are required');
      const data = await GuardMonthlyHoursService.getPayrollHours(
        parseInt(year as string, 10),
        parseInt(month as string, 10)
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}
