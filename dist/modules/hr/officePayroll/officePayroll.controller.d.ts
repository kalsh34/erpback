import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class OfficePayrollController {
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static generate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updateSalaryInputs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static enterOt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static calculate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static check(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static initiatePayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static confirmPaid(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static returnForCorrection(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=officePayroll.controller.d.ts.map