import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class GuardShiftController {
    /** POST /api/attendance/shifts/clock-in  { siteId } */
    static clockIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /** POST /api/attendance/shifts/clock-out */
    static clockOut(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /** GET /api/attendance/shifts/my — guard portal dashboard/shifts data. */
    static my(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=guardShift.controller.d.ts.map