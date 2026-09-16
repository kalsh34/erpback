import { Request, Response, NextFunction } from 'express';
export declare class PayrollConfigController {
    static getComponents(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getComponentById(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createComponent(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateComponent(req: Request, res: Response, next: NextFunction): Promise<void>;
    static retireComponent(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrentFormula(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getFormulaVersion(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getAllFormulas(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createFormula(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getTaxBrackets(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrentTaxBracket(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createTaxBracket(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPensionRules(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrentPensionRule(req: Request, res: Response, next: NextFunction): Promise<void>;
    static createPensionRule(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getConfigDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=payrollConfig.controller.d.ts.map