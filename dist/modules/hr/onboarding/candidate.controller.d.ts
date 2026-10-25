import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class CandidateController {
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updateStage(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static reject(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getStats(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=candidate.controller.d.ts.map