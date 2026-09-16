import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class UserController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static activate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static deactivate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getRoles(_req: Request, res: Response): Promise<void>;
}
export {};
//# sourceMappingURL=user.controller.d.ts.map