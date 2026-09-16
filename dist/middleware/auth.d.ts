import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
export interface AuthUser {
    userId: string;
    email: string;
    role: UserRole;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare const authenticate: (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map