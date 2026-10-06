import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class GuardAttendanceController {
    static getConfig(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getDay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static saveDay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static voidRecord(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getMonthly(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPayrollReadiness(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listRecords(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=guardAttendance.controller.d.ts.map