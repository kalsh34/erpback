import { Request, Response, NextFunction } from 'express';
import { AuthUser } from '../../../middleware/auth';
interface AuthenticatedRequest extends Request {
    user?: AuthUser;
}
export declare class ContractController {
    static getByEmployee(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAll(req: any, res: Response, next: NextFunction): Promise<void>;
    static create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
    static delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
}
export {};
//# sourceMappingURL=contract.controller.d.ts.map