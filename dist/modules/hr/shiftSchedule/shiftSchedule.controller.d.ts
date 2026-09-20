import { Request, Response, NextFunction } from 'express';
export declare class ShiftScheduleController {
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    static delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    static addGuards(req: Request, res: Response, next: NextFunction): Promise<void>;
    static removeGuard(req: Request, res: Response, next: NextFunction): Promise<void>;
    static reorderPool(req: Request, res: Response, next: NextFunction): Promise<void>;
    static addFloaters(req: Request, res: Response, next: NextFunction): Promise<void>;
    static removeFloater(req: Request, res: Response, next: NextFunction): Promise<void>;
    static preview(req: Request, res: Response, next: NextFunction): Promise<void>;
    static generate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAssignments(req: Request, res: Response, next: NextFunction): Promise<void>;
    static clearAssignments(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getGuardCommitments(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=shiftSchedule.controller.d.ts.map