import { Request, Response, NextFunction } from 'express';
export declare class AuthController {
    static register(req: Request, res: Response, next: NextFunction): Promise<void>;
    static login(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getMe(req: Request, res: Response, next: NextFunction): Promise<void>;
    static changePassword(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map