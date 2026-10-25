import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../types';
export interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
    /** Effective per-user permissions (role defaults + module grants − denies). */
    permissions?: Permission[];
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map