import { Request, Response, NextFunction } from 'express';
/** STAFF PAYROLL v2 — contract-driven runs, overtime, bonus, lifecycle. */
export declare class StaffPayrollController {
    static status(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static list(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    static createRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static recalculateRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listRuns(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getRecord(req: Request, res: Response, next: NextFunction): Promise<void>;
    static submitRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static checkRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static approveRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static returnRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static payRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listOvertime(req: Request, res: Response, next: NextFunction): Promise<void>;
    static saveOvertime(req: Request, res: Response, next: NextFunction): Promise<void>;
    static cancelOvertime(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listBonuses(req: Request, res: Response, next: NextFunction): Promise<void>;
    static saveBonus(req: Request, res: Response, next: NextFunction): Promise<void>;
    static cancelBonus(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportBank(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportTax(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportPension(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPayslip(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=staffPayroll.controller.d.ts.map