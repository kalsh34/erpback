import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class GuardMonthlyHoursController {
    /** GET /api/attendance/monthly-sheet?year=&month=&siteId= */
    static getSheet(req: Request, res: Response, next: NextFunction): Promise<void>;
    /** POST /api/attendance/monthly-sheet */
    static saveSheet(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    /** GET /api/attendance/monthly-sheet/payroll-hours?year=&month= */
    static getPayrollHours(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=monthlyHours.controller.d.ts.map