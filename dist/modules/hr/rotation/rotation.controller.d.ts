import { Request, Response, NextFunction } from 'express';
export declare class RotationController {
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    static delete(req: Request, res: Response, next: NextFunction): Promise<void>;
    static addGuards(req: Request, res: Response, next: NextFunction): Promise<void>;
    static removeGuard(req: Request, res: Response, next: NextFunction): Promise<void>;
    static reorderPool(req: Request, res: Response, next: NextFunction): Promise<void>;
    static addFloaters(req: Request, res: Response, next: NextFunction): Promise<void>;
    static removeFloater(req: Request, res: Response, next: NextFunction): Promise<void>;
    static checkFairness(req: Request, res: Response, next: NextFunction): Promise<void>;
    static preview(req: Request, res: Response, next: NextFunction): Promise<void>;
    static generate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAssignments(req: Request, res: Response, next: NextFunction): Promise<void>;
    static activate(req: Request, res: Response, next: NextFunction): Promise<void>;
    static pause(req: Request, res: Response, next: NextFunction): Promise<void>;
    static archive(req: Request, res: Response, next: NextFunction): Promise<void>;
    static suggestLeaveCoverA(req: Request, res: Response, next: NextFunction): Promise<void>;
    static suggestLeaveCoverB(req: Request, res: Response, next: NextFunction): Promise<void>;
    static applyLeaveCoverage(req: Request, res: Response, next: NextFunction): Promise<void>;
    static cancelLeaveCoverage(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=rotation.controller.d.ts.map