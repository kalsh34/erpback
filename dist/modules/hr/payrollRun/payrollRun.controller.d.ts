import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class PayrollRunController {
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static markPaid(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static remove(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=payrollRun.controller.d.ts.map