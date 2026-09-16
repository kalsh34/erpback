import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';

export class ReportsController {
  static async getPayrollSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await ReportsService.getPayrollSummary(req.query.payrollPeriodId as string);
      res.json({ success: true, data: summary });
    } catch (error) { next(error); }
  }

  static async getSiteLaborCost(req: Request, res: Response, next: NextFunction) {
    try {
      const costs = await ReportsService.getSiteLaborCost(req.query.payrollPeriodId as string);
      res.json({ success: true, data: costs });
    } catch (error) { next(error); }
  }

  static async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, page, limit } = req.query;
      const result = await ReportsService.getPaymentHistory({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) { next(error); }
  }
}
