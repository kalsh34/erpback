import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class FinanceController {
    static getAllPeriods(req: any, res: Response, next: NextFunction): Promise<void>;
    static getPeriodById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updatePeriodStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static lockPeriod(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static setRates(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getRates(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=finance.controller.d.ts.map