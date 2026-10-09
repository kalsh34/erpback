import { Request, Response, NextFunction } from 'express';
/** Shared payroll configuration endpoints: tax tables, pension rules, deductions. */
export declare class PayrollCommonController {
    static listTaxTables(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createTaxTable(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listPensionRules(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createPensionRule(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listDeductions(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createDeduction(req: Request, res: Response, next: NextFunction): Promise<void>;
    static cancelDeduction(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=payrollCommon.controller.d.ts.map