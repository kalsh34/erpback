import { Request, Response, NextFunction } from 'express';
export declare class PurchaseReportController {
    static getDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getPOSummary(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getSupplierSpend(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getProductPriceHistory(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getOutstanding(req: Request, res: Response, next: NextFunction): Promise<void>;
    static getSpendAnalysis(req: Request, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=purchaseReport.controller.d.ts.map