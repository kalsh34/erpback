import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { StaffPayrollRunService } from './staffPayrollRun.service';
import { StaffPayrollEntriesService } from './staffPayrollEntries.service';
import { StaffPayrollRun } from '../../models/StaffPayrollRun';
import { StaffPayrollRecord } from '../../models/StaffPayrollRecord';
import { ApiError } from '../../common/ApiError';

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
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { periodKey, payrollPeriodId, runId } = req.query;
      let run: any = null;
      if (runId) {
        if (mongoose.Types.ObjectId.isValid(runId as string)) {
          run = await StaffPayrollRun.findById(runId);
        }
      } else if (periodKey) {
        run = await StaffPayrollRun.findOne({ periodKey: periodKey as string });
      } else if (payrollPeriodId) {
        if (mongoose.Types.ObjectId.isValid(payrollPeriodId as string)) {
          run = await StaffPayrollRun.findById(payrollPeriodId as string);
        }
        if (!run) {
          run = await StaffPayrollRun.findOne({ periodKey: payrollPeriodId as string });
        }
      }
      if (!run) {
        run = await StaffPayrollRun.findOne().sort({ periodKey: -1 });
      }

      if (!run) {
        return res.json({ success: true, data: [], run: null });
      }

      const records = await StaffPayrollRecord.find({ runId: run._id })
        .sort({ 'snapshot.employeeCode': 1 });

      const mapped = records.map((r) => ({
        ...r.toObject(),
        employeeId: {
          _id: r.employeeId,
          firstName: r.snapshot.fullName.split(' ')[0] || '',
          lastName: r.snapshot.fullName.split(' ').slice(1).join(' ') || '',
          employeeCode: r.snapshot.employeeCode,
          department: r.snapshot.department,
          position: r.snapshot.jobPosition,
        },
        basicSalary: r.snapshot.basic,
        responsibilityAllowance: r.snapshot.responsibilityAllowance,
        teleAllowance: r.snapshot.teleAllowance,
        taxableTransport: r.snapshot.taxableTransport,
        nonTaxableTransport: r.snapshot.nonTaxableTransport,
        overtime: r.overtimeAmount,
        regularOtHours: 0,
        holidayOtHours: 0,
        grossSalary: r.grossEarnings,
        taxableSalary: r.taxableEarnings,
        status: run.status,
      }));

      res.json({ success: true, data: mapped, run });
    } catch (error) { next(error); }
  }

  static async createRun(req: Request, res: Response, next: NextFunction) {
    try {
      const periodKey = req.body?.periodKey || req.params?.periodKey;
      if (!periodKey) throw ApiError.badRequest('periodKey (YYYY-MM) is required');
      res.status(201).json({ success: true, data: await StaffPayrollRunService.calculate(periodKey, userId(req), auditCtx(req)) });
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

  // ── Exports & Payslip ──────────────────────────────────────────────
  static async exportBank(req: Request, res: Response, next: NextFunction) {
    try {
      const { bank } = req.query;
      const file = await StaffPayrollRunService.exportBankDisbursement(req.params.id, bank as string | undefined);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async exportTax(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await StaffPayrollRunService.exportTaxReport(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async exportPension(req: Request, res: Response, next: NextFunction) {
    try {
      const file = await StaffPayrollRunService.exportPensionReport(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(file.csv);
    } catch (error) { next(error); }
  }

  static async getPayslip(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await StaffPayrollRunService.getPayslip(req.params.id) });
    } catch (error) { next(error); }
  }
}

