import { Request, Response, NextFunction } from 'express';
import { ShiftScheduleService } from './shiftSchedule.service';

export class ShiftScheduleController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search, siteId } = req.query;
      const result = await ShiftScheduleService.getAll({
        status: status as string, search: search as string, siteId: siteId as string,
      });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.create(req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.update(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await ShiftScheduleService.delete(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, message: 'Shift schedule deleted' });
    } catch (error) { next(error); }
  }

  static async addGuards(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.addGuards(req.params.id, req.body.guardIds || [], req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async removeGuard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.removeGuard(req.params.id, req.params.guardId, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async reorderPool(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.reorderPool(req.params.id, req.body.orderedGuardIds || [], req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async addFloaters(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.addFloaters(req.params.id, req.body.guardIds || [], req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async removeFloater(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.removeFloater(req.params.id, req.params.guardId, req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const result = await ShiftScheduleService.preview(req.params.id, startDate as string, endDate as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.generate(
        req.params.id,
        { startDate: req.body.startDate, endDate: req.body.endDate, overwrite: req.body.overwrite },
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') }
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const result = await ShiftScheduleService.getAssignments(req.params.id, startDate as string, endDate as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async clearAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShiftScheduleService.clearAssignments(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getGuardCommitments(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const result = await ShiftScheduleService.getGuardCommitments(req.params.id, startDate as string, endDate as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}
