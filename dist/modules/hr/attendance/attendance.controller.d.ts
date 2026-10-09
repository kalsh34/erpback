import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class AttendanceController {
    static clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static overrideClockOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getOnDuty(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCoverageAlerts(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getActiveShift(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getTodayRecord(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getRecentRecords(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getGuardHours(req: Request, res: Response, next: NextFunction): Promise<void>;
    static editHours(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getByGuardAndPeriod(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAllAttendance(req: Request, res: Response, next: NextFunction): Promise<void>;
    static manualEntry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static manualEntryBulk(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static correctManualEntry(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=attendance.controller.d.ts.map