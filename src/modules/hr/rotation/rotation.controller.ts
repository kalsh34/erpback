import { Request, Response, NextFunction } from 'express';
import { RotationService } from './rotation.service';

function errPayload(error: any): { status: number; body: any } {
  const status = error?.statusCode || 500;
  const body: any = {
    success: false,
    message: error?.message || 'Internal server error',
  };
  if (error?.violations) body.violations = error.violations;
  if (error?.data) body.data = error.data;
  return { status, body };
}

export class RotationController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.create(req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.status(201).json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, search } = req.query;
      const result = await RotationService.getAll({ status: status as string, search: search as string });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.update(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await RotationService.delete(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, message: 'Rotation deleted' });
    } catch (error) { next(error); }
  }

  static async addGuards(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.addGuards(req.params.id, req.body.guardIds || [], req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async removeGuard(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.removeGuard(req.params.id, req.params.guardId, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async reorderPool(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.reorderPool(req.params.id, req.body.orderedGuardIds || [], req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async addFloaters(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.addFloaters(req.params.id, req.body.guardIds || [], req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async removeFloater(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.removeFloater(req.params.id, req.params.guardId, req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async checkFairness(req: Request, res: Response, next: NextFunction) {
    try {
      const { poolSize, slotCount } = req.query;
      const result = RotationService.checkFairness(parseInt(poolSize as string) || 0, parseInt(slotCount as string) || 0);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || undefined;
      const startDate = req.query.startDate as string | undefined;
      const result = await RotationService.preview(req.params.id, days, startDate);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.body.days) || undefined;
      const result = await RotationService.generate(
        req.params.id,
        days,
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') },
        req.body.startDate,
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt((req.body.days || req.query.days) as string) || undefined;
      const startDate = (req.body.startDate || req.query.startDate) as string | undefined;
      const result = await RotationService.validate(req.params.id, days, startDate);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || undefined;
      const startDate = req.query.startDate as string | undefined;
      const result = await RotationService.getStats(req.params.id, days, startDate);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getConflicts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.getConflicts(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.approve(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.publish(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const result = await RotationService.getAssignments(req.params.id, startDate as string, endDate as string);
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.activate(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.pause(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.archive(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.complete(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.cancel(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async move(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.move(
        req.params.id,
        req.body,
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') },
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const e: any = error;
      if (e?.statusCode === 409 && e?.violations) {
        res.status(409).json({ success: false, message: e.message, violations: e.violations });
        return;
      }
      next(error);
    }
  }

  static async moveOverride(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.move(
        req.params.id,
        { ...req.body, override: true },
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') },
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const e: any = error;
      if (e?.statusCode === 409 && e?.violations) {
        res.status(409).json({ success: false, message: e.message, violations: e.violations });
        return;
      }
      next(error);
    }
  }

  static async rotate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.rotate(
        req.params.id,
        req.body || {},
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') },
      );
      res.json({ success: true, data: result });
    } catch (error) {
      const e: any = error;
      if (e?.statusCode === 409 && e?.violations) {
        res.status(409).json({ success: false, message: e.message, violations: e.violations });
        return;
      }
      next(error);
    }
  }

  static async recalculate(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.body.days) || undefined;
      const result = await RotationService.recalculate(
        req.params.id,
        days,
        req.user?.userId || '',
        { ip: req.ip, ua: req.get('user-agent') },
      );
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async suggestLeaveCoverA(req: Request, res: Response, next: NextFunction) {
    try {
      const { guardId, date } = req.query;
      const result = await RotationService.suggestLeaveCoverA(req.params.id, guardId as string, new Date(date as string));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async suggestLeaveCoverB(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.query;
      const result = await RotationService.suggestLeaveCoverB(req.params.id, new Date(date as string));
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async applyLeaveCoverage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.applyLeaveCoverage(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }

  static async cancelLeaveCoverage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RotationService.cancelLeaveCoverage(req.params.id, req.body.guardId, new Date(req.body.startDate), req.user?.userId || '');
      res.json({ success: true, data: result });
    } catch (error) { next(error); }
  }
}
