import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class ServiceLibraryController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static reactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=serviceLibrary.controller.d.ts.map