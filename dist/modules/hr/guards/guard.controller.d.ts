import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class GuardController {
    static registerGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static assignSite(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getGuardSites(req: Request, res: Response, next: NextFunction): Promise<void>;
    static removeSiteAssignment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static getAllGuards(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getGuardDetail(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateGuard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static updatePayRate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static setHomeSite(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=guard.controller.d.ts.map