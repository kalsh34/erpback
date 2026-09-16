import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class StaffAttendanceController {
    static saveDayStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static bulkMarkDay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getGrid(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMonthlySummary(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAllPeriods(req: Request, res: Response, next: NextFunction): Promise<void>;
    static lockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static unlockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=staffAttendance.controller.d.ts.map