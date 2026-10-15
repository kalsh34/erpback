import { Request, Response, NextFunction } from 'express';
import { GuardShiftService } from './guardShift.service';
import { AuthUser } from '../../../middleware/auth';
import { ApiError } from '../../../common/ApiError';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class GuardShiftController {
  /** POST /api/attendance/shifts/clock-in  { siteId } */
  static async clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const { siteId } = req.body || {};
      if (!siteId) throw ApiError.badRequest('siteId is required — scan the site QR code first');
      const shift = await GuardShiftService.clockIn(req.user.userId, siteId);
      res.status(201).json({ success: true, data: shift });
    } catch (error) { next(error); }
  }

  /** POST /api/attendance/shifts/clock-out */
  static async clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const result = await GuardShiftService.clockOut(req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  /** POST /api/attendance/shifts/patrol  { siteId } — QR patrol scan during an open shift. */
  static async patrol(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const { siteId } = req.body || {};
      if (!siteId || typeof siteId !== 'string') throw ApiError.badRequest('siteId is required — scan the site QR code');
      const scan = await GuardShiftService.recordPatrol(req.user.userId, siteId);
      res.status(201).json({ success: true, data: scan });
    } catch (error) { next(error); }
  }

  /** GET /api/attendance/shifts/site/:siteId — site details for the guard QR scanner. */
  static async scanSite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const data = await GuardShiftService.getScanSite(String(req.params.siteId));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  /** GET /api/attendance/shifts/activity?from&to&siteId&employeeId — admin event monitor. */
  static async activity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const ymd = /^\d{4}-\d{2}-\d{2}$/;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
      const from = str(req.query.from);
      const to = str(req.query.to);
      if ((from && !ymd.test(from)) || (to && !ymd.test(to))) {
        throw ApiError.badRequest('from and to must be YYYY-MM-DD');
      }
      const data = await GuardShiftService.listActivity({
        from,
        to,
        siteId: str(req.query.siteId),
        employeeId: str(req.query.employeeId),
      });
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  /** GET /api/attendance/shifts/my — guard portal dashboard/shifts data. */
  static async my(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 60;
      const data = await GuardShiftService.getMyShifts(req.user.userId, limit);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}
