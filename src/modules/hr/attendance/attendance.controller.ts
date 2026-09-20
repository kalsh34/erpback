import { Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class AttendanceController {
  static async clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.clockIn(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.clockOut(
        req.params.guardId,
        {
          siteId: req.body.siteId || req.query.siteId as string,
          declaredRelieverId: req.body.declaredRelieverId,
          declaredRelieverSiteId: req.body.declaredRelieverSiteId,
        },
        {
          userId: req.user?.userId || '',
          ip: req.ip,
          ua: req.get('user-agent'),
        }
      );
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async overrideClockOut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.overrideClockOut(
        req.params.recordId,
        req.body.reason,
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async getOnDuty(req: Request, res: Response, next: NextFunction) {
    try {
      const guardIds = await AttendanceService.getOnDutyGuardIds(req.params.siteId);
      res.json({ success: true, data: guardIds });
    } catch (error) { next(error); }
  }

  static async getCoverageAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AttendanceService.checkCoverageAlert(req.params.siteId);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getActiveShift(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.getActiveShift(req.params.guardId);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async getTodayRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.getTodayRecord(req.params.guardId);
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async getRecentRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const records = await AttendanceService.getRecentRecords(req.params.guardId, days);
      res.json({ success: true, data: records });
    } catch (error) { next(error); }
  }

  static async getGuardHours(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AttendanceService.getGuardHours(
        req.params.guardId,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async editHours(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.editHours(req.params.id, req.body, req.user?.userId || '', {
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async getByGuardAndPeriod(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await AttendanceService.getByGuardAndPeriod(
        req.params.guardId,
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      res.json({ success: true, data: records });
    } catch (error) { next(error); }
  }

  static async getAllAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await AttendanceService.getAllAttendance(
        new Date(req.query.startDate as string),
        new Date(req.query.endDate as string)
      );
      res.json({ success: true, data: records });
    } catch (error) { next(error); }
  }

  static async manualEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AttendanceService.manualEntry(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({
        success: true,
        data: result.record,
        flagged: result.flagged || undefined,
      });
    } catch (error) { next(error); }
  }

  static async manualEntryBulk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AttendanceService.manualEntryBulk(req.body, {
        userId: req.user?.userId || '',
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async correctManualEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await AttendanceService.correctManualEntry(
        req.params.id,
        req.body,
        {
          userId: req.user?.userId || '',
          ip: req.ip,
          ua: req.get('user-agent'),
        }
      );
      res.json({ success: true, data: record });
    } catch (error) { next(error); }
  }
}
