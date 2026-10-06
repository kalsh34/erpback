import { Request, Response, NextFunction } from 'express';
import { GuardPayrollRunService } from './guardPayrollRun.service';
import { GuardPayrollConfigService } from './guardPayrollConfig.service';
import { SiteCompensationService } from './siteCompensation.service';
import { ApiError } from '../../common/ApiError';

const auditCtx = (req: Request) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req: Request) => req.user?.userId || '';

/** GUARD PAYROLL v2 — runs, records, site compensation, config, locks. */
export class GuardPayrollController {
  // ── Status (kept from the skeleton) ────────────────────────────────
  static async status(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          system: 'GUARD_PAYROLL',
          version: 2,
          state: 'ACTIVE',
          message: 'Guard payroll v2 is active: attendance-driven, site-by-site, snapshot-based.',
        },
      });
    } catch (error) { next(error); }
  }

  // ── Config ─────────────────────────────────────────────────────────
  static async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollConfigService.get() });
    } catch (error) { next(error); }
  }

  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollConfigService.update({ ...req.body, userId: userId(req) }) });
    } catch (error) { next(error); }
  }

  // ── Site compensation ──────────────────────────────────────────────
  static async listCompensations(req: Request, res: Response, next: NextFunction) {
    try {
      const { siteId, currentOnly } = req.query;
      res.json({
        success: true,
        data: await SiteCompensationService.listAll({
          siteId: siteId as string | undefined,
          currentOnly: currentOnly === 'true',
        }),
      });
    } catch (error) { next(error); }
  }

  static async createCompensation(req: Request, res: Response, next: NextFunction) {
    try {
      const doc = await SiteCompensationService.create({ ...req.body, userId: userId(req) });
      res.status(201).json({ success: true, data: doc });
    } catch (error) { next(error); }
  }

  static async deleteCompensation(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await SiteCompensationService.remove(req.params.id) });
    } catch (error) { next(error); }
  }

  // ── Runs & records ─────────────────────────────────────────────────
  static async createRun(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodKey } = req.body;
      if (!periodKey) throw ApiError.badRequest('periodKey (YYYY-MM) is required');
      res.status(201).json({ success: true, data: await GuardPayrollRunService.calculate(periodKey, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async recalculateRun(req: Request, res: Response, next: NextFunction) {
    try {
      const run = await GuardPayrollRunService.getRun(req.params.id);
      res.json({ success: true, data: await GuardPayrollRunService.calculate(run.run.periodKey, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async listRuns(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await GuardPayrollRunService.listRuns({
          periodKey: req.query.periodKey as string | undefined,
          status: req.query.status as string | undefined,
        }),
      });
    } catch (error) { next(error); }
  }

  static async getRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.getRun(req.params.id) });
    } catch (error) { next(error); }
  }

  static async getRecord(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.getRecord(req.params.id) });
    } catch (error) { next(error); }
  }

  static async myPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await GuardPayrollRunService.myPayroll(userId(req), req.query.periodKey as string | undefined),
      });
    } catch (error) { next(error); }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────
  static async submitRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.submit(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async checkRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.check(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async approveRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.approve(req.params.id, userId(req), auditCtx(req)) });
    } catch (error) { next(error); }
  }

  static async returnRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await GuardPayrollRunService.returnForCorrection(req.params.id, req.body?.reason, userId(req), auditCtx(req)),
      });
    } catch (error) { next(error); }
  }

  static async payRun(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: await GuardPayrollRunService.markPaid(req.params.id, req.body?.paymentRef, userId(req), auditCtx(req)),
      });
    } catch (error) { next(error); }
  }

  // ── Attendance lock (consumed by the attendance pages) ─────────────
  static async attendanceLock(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodKey } = req.query;
      if (!periodKey) throw ApiError.badRequest('periodKey (YYYY-MM) is required');
      res.json({ success: true, data: await GuardPayrollRunService.getAttendanceLock(periodKey as string) });
    } catch (error) { next(error); }
  }
}
