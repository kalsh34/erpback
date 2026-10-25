import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class RFQController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static send(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static recordQuotation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static approve(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static convertToPO(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static compare(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=rfq.controller.d.ts.map