import { Request, Response, NextFunction } from 'express';
import { StaffAttendanceService } from './staffAttendance.service';
import { AuthUser } from '../../../middleware/auth';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export class StaffAttendanceController {
  static async saveDayStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const record = await StaffAttendanceService.saveDayStatus(
        { ...req.body, recordedBy: req.user?.userId || '' },
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.status(201).json({ success: true, data: record });
    } catch (error) { next(error); }
  }

  static async bulkMarkDay(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const records = await StaffAttendanceService.bulkMarkDay(
        { ...req.body, recordedBy: req.user?.userId || '' },
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.status(201).json({ success: true, data: records });
    } catch (error) { next(error); }
  }

  static async getGrid(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;
      const result = await StaffAttendanceService.getGrid(parseInt(year as string), parseInt(month as string));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getMonthlySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const { year, month } = req.query;
      const result = await StaffAttendanceService.getMonthlySummary(parseInt(year as string), parseInt(month as string));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}
