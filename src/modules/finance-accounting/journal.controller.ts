import { Request, Response, NextFunction } from 'express';
import { JournalService } from './journal.service';

export class JournalController {
  static async createEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await JournalService.createEntry({
        ...req.body,
        userId: (req as any).user._id,
        ip: req.ip,
        ua: req.get('user-agent'),
      });
      res.status(201).json({ success: true, data: entry });
    } catch (err) { next(err); }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await JournalService.getAll(req.query as any);
      res.json({ success: true, ...result });
    } catch (err) { next(err); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await JournalService.getById(req.params.id);
      res.json({ success: true, data: entry });
    } catch (err) { next(err); }
  }

  static async voidEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const entry = await JournalService.voidEntry(
        req.params.id,
        req.body.reason,
        (req as any).user._id,
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.json({ success: true, data: entry });
    } catch (err) { next(err); }
  }

  static async getAccountSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await JournalService.getAccountSummary(req.query as any);
      res.json({ success: true, data: summary });
    } catch (err) { next(err); }
  }

  static async getDashboardSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await JournalService.getDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (err) { next(err); }
  }
}
