import { Request, Response, NextFunction } from 'express';
export declare class ProformaController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    static issue(req: Request, res: Response, next: NextFunction): Promise<void>;
    static void(req: Request, res: Response, next: NextFunction): Promise<void>;
    static amend(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=proforma.controller.d.ts.map