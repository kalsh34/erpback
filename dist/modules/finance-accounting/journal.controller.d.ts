import { Request, Response, NextFunction } from 'express';
export declare class JournalController {
    static createEntry(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static voidEntry(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAccountSummary(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getDashboardSummary(_req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=journal.controller.d.ts.map