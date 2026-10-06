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
      const { page, limit, guardId } = req.query;
      const result = await ReportsService.getPaymentHistory({
        page: parseInt(page as string) || 1,
        limit: parseInt(limit as string) || 20,
        guardId: guardId as string | undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}
