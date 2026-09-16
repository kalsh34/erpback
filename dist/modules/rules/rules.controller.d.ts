import { Request, Response, NextFunction } from 'express';
export declare class RulesController {
    static getTaxBrackets(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrentTaxBracket(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static createTaxBracket(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPensionRules(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static getCurrentPensionRule(_req: Request, res: Response, next: NextFunction): Promise<void>;
    static createPensionRule(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=rules.controller.d.ts.map