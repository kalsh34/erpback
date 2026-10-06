import { Request, Response, NextFunction } from 'express';
import { StaffPayrollRunService } from './staffPayrollRun.service';
import { StaffPayrollEntriesService } from './staffPayrollEntries.service';

const auditCtx = (req: Request) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req: Request) => req.user?.userId || '';

/** STAFF PAYROLL v2 — contract-driven runs, overtime, bonus, lifecycle. */
export class StaffPayrollController {
  // ── Status ─────────────────────────────────────────────────────────
  static async status(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          system: 'STAFF_PAYROLL',
          version: 2,
          state: 'ACTIVE',
          message: 'Staff payroll v2 is active: contract-driven, formula-frozen, snapshot-based.',
        },
      });
    } catch (error) { next(error); }
  }

  // ── Runs ───────────────────────────────────────────────────────────
  static async createRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await StaffPayrollRunService.calculate(req.body.periodKey, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async recalculateRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.recalculate(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async listRuns(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await StaffPayrollRunService.listRuns({
          periodKey: req.query.periodKey as string | undefined,
          status: req.query.status as string | undefined,
        }),
      });
    } catch (error) { next(error); }
  }

  static async getRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.getRun(req.params.id) });
    } catch (error) { next(error); }
  }

  static async getRecord(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.getRecord(req.params.id) });
    } catch (error) { next(error); }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  static async submitRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.submit(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async checkRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.check(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async approveRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.approve(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async returnRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await StaffPayrollRunService.returnForCorrection(req.params.id, req.body.reason, userId(req), auditCtx(req)),
      });
    } catch (error) { next(error); }
  }

  static async payRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.markPaid(req.params.id, req.body?.paymentRef, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  // ── Overtime ───────────────────────────────────────────────────────
  static async listOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await StaffPayrollEntriesService.listOvertime({
          periodKey: req.query.periodKey as string | undefined,
          employeeId: req.query.employeeId as string | undefined,
        }),
      });
    } catch (error) { next(error); }
  }

  static async saveOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await StaffPayrollEntriesService.saveOvertime(req.body, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async cancelOvertime(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollEntriesService.cancelOvertime(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  // ── Bonus (outside the formula) ────────────────────────────────────
  static async listBonuses(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await StaffPayrollEntriesService.listBonuses({
          periodKey: req.query.periodKey as string | undefined,
          employeeId: req.query.employeeId as string | undefined,
        }),
      });
    } catch (error) { next(error); }
  }

  static async saveBonus(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await StaffPayrollEntriesService.saveBonus(req.body, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async cancelBonus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollEntriesService.cancelBonus(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }
}
