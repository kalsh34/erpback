import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { GuardPayrollRunService } from './guardPayrollRun.service';
import { GuardPayrollConfigService } from './guardPayrollConfig.service';
import { SiteCompensationService } from './siteCompensation.service';
import { GuardPayrollRun } from '../../models/GuardPayrollRun';
import { GuardPayrollRecord } from '../../models/GuardPayrollRecord';
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
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodKey, payrollPeriodId, runId } = req.query;
      let run: any = null;
      if (runId) {
        if (mongoose.Types.ObjectId.isValid(runId as string)) {
          run = await GuardPayrollRun.findById(runId);
        }
      } else if (periodKey) {
        run = await GuardPayrollRun.findOne({ periodKey: periodKey as string });
      } else if (payrollPeriodId) {
        if (mongoose.Types.ObjectId.isValid(payrollPeriodId as string)) {
          run = await GuardPayrollRun.findById(payrollPeriodId as string);
        }
        if (!run) {
          run = await GuardPayrollRun.findOne({ periodKey: payrollPeriodId as string });
        }
      }
      if (!run) {
        run = await GuardPayrollRun.findOne().sort({ periodKey: -1 });
      }

      if (!run) {
        return res.json({ success: true, data: [], run: null });
      }

      const records = await GuardPayrollRecord.find({ runId: run._id })
        .populate('primarySite.siteId', 'siteName siteCode')
        .sort({ 'snapshot.employeeCode': 1 });

      const mapped = records.map((r) => ({
        ...r.toObject(),
        guardId: {
          _id: r.employeeId,
          firstName: r.snapshot.fullName.split(' ')[0] || '',
          lastName: r.snapshot.fullName.split(' ').slice(1).join(' ') || '',
          employeeCode: r.snapshot.employeeCode,
        },
        guardName: r.snapshot.fullName,
        period: r.periodKey,
        primarySiteId: {
          _id: r.primarySite.siteId,
          siteName: r.primarySite.siteName,
        },
        normalHours: r.primarySite.normalHours,
        otHours: r.primarySite.holidayHours + r.primarySite.sundayHours,
        regularOtHours: r.primarySite.sundayHours,
        holidayOtHours: r.primarySite.holidayHours,
        grossPay: r.grossEarnings,
        secondaryShiftPay: r.primarySite.transportPaid,
        status: run.status,
      }));

      res.json({ success: true, data: mapped, run });
    } catch (error) { next(error); }
  }

  static async createRun(req: Request, res: Response, next: NextFunction) {
    try {
      const periodKey = req.body?.periodKey || req.params?.periodKey;
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

  // ── Exports & Payslip ──────────────────────────────────────────────
  static async exportBank(req: Request, res: Response, next: NextFunction) {
    try {
      const { bank } = req.query;
      const file = await GuardPayrollRunService.exportBankDisbursement(req.params.id, bank as string | undefined);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async exportTax(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await GuardPayrollRunService.exportTaxReport(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async exportPension(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await GuardPayrollRunService.exportPensionReport(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async getPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await GuardPayrollRunService.getPayslip(req.params.id) });
    } catch (error) { next(error); }
  }
}
