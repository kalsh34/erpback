import { Request, Response, NextFunction } from 'express';
import { Permission } from '../types';
export declare const authorize: (...allowedPermissions: Permission[]) => (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=rbac.d.ts.map