import { Request, Response, NextFunction } from 'express';
import { GuardAttendanceService } from './guardAttendance.service';
import { AuthUser } from '../../../middleware/auth';
import { hasPermission } from '../../../middleware/rbac';
import { AttendanceSource, PERMISSIONS, UserRole } from '../../../types';
import { ApiError } from '../../../common/ApiError';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Advance entry is a configurable permission — not a free-for-all. */
function canEnterFuture(user?: AuthUser): boolean {
  return !!user && hasPermission(user.role, PERMISSIONS.GUARD_ATTENDANCE_FUTURE);
}

function sourceFor(user?: AuthUser): AttendanceSource {
  return user?.role === UserRole.OPERATIONS ? AttendanceSource.OPERATIONS_EDIT : AttendanceSource.HR_MANUAL;
}

export class GuardAttendanceController {
  static async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: GuardAttendanceService.getConfig() });
    } catch (error) { next(error); }
  }

  static async getDay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { siteId, date } = req.query;
      if (!siteId || !date) throw ApiError.badRequest('siteId and date are required');
      const data = await GuardAttendanceService.getDayRoster(siteId as string, date as string, {
        allowFuture: canEnterFuture(req.user),
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async saveDay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { siteId, date, entries } = req.body;
      const result = await GuardAttendanceService.saveDay(
        {
          siteId,
          date,
          entries,
          userId: req.user?.userId || '',
          allowFuture: canEnterFuture(req.user),
          source: sourceFor(req.user),
        },
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.status(result.failed.length > 0 ? 207 : 201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async voidRecord(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await GuardAttendanceService.voidRecord(
        req.params.id,
        req.body.reason,
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async getMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month, siteId } = req.query;
      const data = await GuardAttendanceService.getMonthlyTotals(
        parseInt(year as string, 10),
        parseInt(month as string, 10),
        siteId ? (siteId as string) : undefined
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async getPayrollReadiness(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;
      const data = await GuardAttendanceService.getPayrollReadiness(
        parseInt(year as string, 10),
        parseInt(month as string, 10)
      );
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  static async listRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId, guardId, from, to, limit } = req.query;
      const data = await GuardAttendanceService.listRecords({
        siteId: siteId ? (siteId as string) : undefined,
        guardId: guardId ? (guardId as string) : undefined,
        from: from as string,
        to: to as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}
