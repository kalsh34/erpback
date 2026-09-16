import { Request, Response, NextFunction } from 'express';
export declare class SalaryStructureController {
    static getAll(req: QueryRequest, res: Response, next: NextFunction): Promise<void>;
    static getById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrent(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getDashboard(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static create(req: Request, res: Response, next: NextFunction): Promise<void>;
    static update(req: Request, res: Response, next: NextFunction): Promise<void>;
    static retire(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getVersions(req: Request, res: Response, next: NextFunction): Promise<void>;
    static duplicate(req: Request, res: Response, next: NextFunction): Promise<void>;
}
interface QueryRequest extends Request {
    query: {
        employeeType?: string;
        isCurrent?: string;
    };
}
export {};
//# sourceMappingURL=salaryStructure.controller.d.ts.map