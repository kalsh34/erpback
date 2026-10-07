import { Request, Response, NextFunction } from 'express';
/** GUARD PAYROLL v2 — runs, records, site compensation, config, locks. */
export declare class GuardPayrollController {
    static status(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getConfig(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateConfig(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listCompensations(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createCompensation(req: Request, res: Response, next: NextFunction): Promise<void>;
    static deleteCompensation(req: Request, res: Response, next: NextFunction): Promise<void>;
    static list(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
    static createRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static recalculateRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static listRuns(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getRecord(req: Request, res: Response, next: NextFunction): Promise<void>;
    static myPayroll(req: Request, res: Response, next: NextFunction): Promise<void>;
    static submitRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static checkRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static approveRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static returnRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static payRun(req: Request, res: Response, next: NextFunction): Promise<void>;
    static attendanceLock(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportBank(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportTax(req: Request, res: Response, next: NextFunction): Promise<void>;
    static exportPension(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPayslip(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=guardPayroll.controller.d.ts.map