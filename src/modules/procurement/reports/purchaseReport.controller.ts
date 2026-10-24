import { Request, Response, NextFunction } from 'express';
import { PurchaseReportService } from './purchaseReport.service';

export class PurchaseReportController {
  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseReportService.getDashboard();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPOSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseReportService.getPOSummaryReport(req.query);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getSupplierSpend(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseReportService.getSupplierSpendReport();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getProductPriceHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.query;
      const result = await PurchaseReportService.getProductPriceHistory(productId as string);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getOutstanding(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseReportService.getOutstandingOrdersReport();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getSpendAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PurchaseReportService.getSpendAnalysis();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
