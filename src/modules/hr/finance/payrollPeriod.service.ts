import { PayrollPeriod, IPayrollPeriod } from '../../../models/PayrollPeriod';
import { ApiError } from '../../../common/ApiError';
import { PayrollPeriodStatus } from '../../../types';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class PayrollPeriodService {
  static async getAll(query: { year?: number; status?: string }) {
    const filter: any = {};
    if (query.year) filter.year = query.year;
    if (query.status) filter.status = query.status;
    return PayrollPeriod.find(filter).sort({ year: -1, month: -1 });
  }

  static async getById(id: string): Promise<IPayrollPeriod> {
    const period = await PayrollPeriod.findById(id);
    if (!period) throw ApiError.notFound('Payroll period not found');
    return period;
  }

  static async create(data: Partial<IPayrollPeriod>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IPayrollPeriod> {
    const existing = await PayrollPeriod.findOne({ year: data.year, month: data.month });
    if (existing) throw ApiError.conflict('Period already exists');
    const period = await PayrollPeriod.create(data);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_PERIOD_CREATE',
        entity: 'PayrollPeriod',
        entityId: (period._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.payroll.periodCreated', { periodId: period._id, year: period.year, month: period.month });

    return period;
  }

  static async updateStatus(id: string, status: PayrollPeriodStatus, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IPayrollPeriod> {
    const period = await PayrollPeriod.findById(id);
    if (!period) throw ApiError.notFound('Payroll period not found');

    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['OPEN'],
      OPEN: ['CLOSED'],
      CLOSED: ['LOCKED'],
    };

    if (!allowedTransitions[period.status]?.includes(status)) {
      throw ApiError.badRequest(`Cannot transition from ${period.status} to ${status}`);
    }

    const oldStatus = period.status;
    period.status = status;
    if (status === PayrollPeriodStatus.LOCKED) {
      period.lockedAt = new Date();
    }
    await period.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'PAYROLL_PERIOD_STATUS_CHANGE',
        entity: 'PayrollPeriod',
        entityId: id,
        oldValues: { status: oldStatus },
        newValues: { status },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.payroll.periodStatusChanged', { periodId: id, oldStatus, newStatus: status });

    return period;
  }

  static async lock(id: string, userId: string, auditCtx?: { ip?: string; ua?: string }): Promise<IPayrollPeriod> {
    return this.updateStatus(id, PayrollPeriodStatus.LOCKED, { userId, ip: auditCtx?.ip, ua: auditCtx?.ua });
  }
}
