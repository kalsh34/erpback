import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class PerformanceController {
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static getStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getTopPerformers(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getReviewsDue(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static createOrUpdate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=performance.controller.d.ts.map