import { PayrollRun, IPayrollRun, PayrollRunStatus } from '../../../models/PayrollRun';
import { PayrollPeriod } from '../../../models/PayrollPeriod';
import { GuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { StaffPayrollRecord } from '../../../models/StaffPayrollRecord';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

interface AuditCtx {
  userId: string;
  ip?: string;
  ua?: string;
}

export class PayrollRunService {
  static async getAll(query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;

    const [runs, total] = await Promise.all([
      PayrollRun.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('periodFrom')
        .populate('periodTo'),
      PayrollRun.countDocuments(filter),
    ]);
    return { data: runs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<IPayrollRun> {
    const run = await PayrollRun.findById(id).populate('periodFrom').populate('periodTo');
    if (!run) throw ApiError.notFound('Payroll run not found');
    return run;
  }

  /**
   * Create a payroll run. Supports either a single period (periodFrom only)
   * or a period range (periodFrom -> periodTo). All periods between the two
   * (inclusive, sorted by year then month) are resolved into periodIds.
   */
  static async create(
    data: {
      name: string;
      runType?: string;
      periodFrom: string;
      periodTo?: string;
    },
    auditCtx?: AuditCtx
  ): Promise<IPayrollRun> {
    if (!data.periodFrom) throw ApiError.badRequest('periodFrom is required');
    if (data.periodTo && data.periodTo === data.periodFrom) {
      delete (data as any).periodTo; // treat identical from/to as a single period
    }

    const from = await PayrollPeriod.findById(data.periodFrom);
    if (!from) throw ApiError.badRequest('Period (from) not found');

    let periods = [from];
    if (data.periodTo) {
      const to = await PayrollPeriod.findById(data.periodTo);
      if (!to) throw ApiError.badRequest('Period (to) not found');

      const all = await PayrollPeriod.find().sort({ year: 1, month: 1 });
      const startIdx = all.findIndex(
        (p) => p.year > from.year || (p.year === from.year && p.month >= from.month)
      );
      const endIdx = all.findIndex(
        (p) => p.year > to.year || (p.year === to.year && p.month >= to.month)
      );
      if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw ApiError.badRequest('Invalid period range: end must be after start');
      }
      periods = all.slice(startIdx, endIdx + 1);
    }

    const label =
      periods.length === 1
        ? `${periods[0].monthName} ${periods[0].year}`
        : `${periods[0].monthName} ${periods[0].year} - ${periods[periods.length - 1].monthName} ${periods[periods.length - 1].year}`;

    const periodObjectIds = periods.map((p) => p._id);
    const runType = data.runType || 'ALL';
    const guardFilter: any = { payrollPeriodId: { $in: periodObjectIds } };
    const staffFilter: any = { payrollPeriodId: { $in: periodObjectIds } };

    let guardRecords: any[] = [];
    let staffRecords: any[] = [];
    if (runType === 'ALL' || runType === 'GUARD') {
      guardRecords = await GuardPayrollRecord.find(guardFilter);
    }
    if (runType === 'ALL' || runType === 'STAFF') {
      staffRecords = await StaffPayrollRecord.find(staffFilter);
    }

    const totalGross =
      guardRecords.reduce((s, r) => s + (r.grossPay || 0), 0) +
      staffRecords.reduce((s, r) => s + (r.grossSalary || 0), 0);
    const totalNet =
      guardRecords.reduce((s, r) => s + (r.netPay || 0), 0) +
      staffRecords.reduce((s, r) => s + (r.netPay || 0), 0);

    const run = await PayrollRun.create({
      name: data.name,
      runType,
      periodFrom: periods[0]._id,
      periodTo: periods.length > 1 ? periods[periods.length - 1]._id : undefined,
      periodIds: periodObjectIds,
      periodLabel: label,
      status: PayrollRunStatus.DRAFT,
      totalGross,
      totalNet,
      employeeCount: guardRecords.length + staffRecords.length,
      createdBy: auditCtx?.userId as any,
    });

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_RUN_CREATE',
        entity: 'PayrollRun',
        entityId: (run._id as any).toString(),
        newValues: { name: run.name, periodLabel: label, status: run.status },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('payroll.run.created', { runId: (run._id as any).toString() });

    return run;
  }

  static async approve(id: string, auditCtx?: AuditCtx): Promise<IPayrollRun> {
    const run = await PayrollRun.findById(id);
    if (!run) throw ApiError.notFound('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw ApiError.badRequest('Only DRAFT payroll runs can be approved');
    }
    run.status = PayrollRunStatus.APPROVED;
    run.approvedBy = auditCtx?.userId as any;
    run.approvedAt = new Date();
    await run.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_RUN_APPROVE',
        entity: 'PayrollRun',
        entityId: id,
        newValues: { status: run.status },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('payroll.run.approved', { runId: id });

    return run;
  }

  static async markPaid(
    id: string,
    data: { paymentMethod?: string; bankReference?: string },
    auditCtx?: AuditCtx
  ): Promise<IPayrollRun> {
    const run = await PayrollRun.findById(id);
    if (!run) throw ApiError.notFound('Payroll run not found');
    if (run.status !== PayrollRunStatus.APPROVED) {
      throw ApiError.badRequest('Only APPROVED payroll runs can be marked as paid');
    }
    run.status = PayrollRunStatus.PAID;
    run.paidBy = auditCtx?.userId as any;
    run.paidAt = new Date();
    run.paymentMethod = data.paymentMethod || run.paymentMethod;
    run.bankReference = data.bankReference || run.bankReference;
    await run.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_RUN_PAID',
        entity: 'PayrollRun',
        entityId: id,
        newValues: { status: run.status, paymentMethod: run.paymentMethod },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('payroll.run.paid', { runId: id });

    return run;
  }

  static async remove(id: string, auditCtx?: AuditCtx): Promise<void> {
    const run = await PayrollRun.findById(id);
    if (!run) throw ApiError.notFound('Payroll run not found');
    if (run.status !== PayrollRunStatus.DRAFT) {
      throw ApiError.badRequest('Only DRAFT payroll runs can be deleted');
    }
    await run.deleteOne();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_RUN_DELETE',
        entity: 'PayrollRun',
        entityId: id,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
  }
}