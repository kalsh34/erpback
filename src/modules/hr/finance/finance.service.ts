import { PayrollRate } from '../../../models/PayrollRate';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class FinanceService {
  static async setPayrollRates(payrollPeriodId: string, data: { normalRate: number; otRate: number; holidayRate: number }, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const existing = await PayrollRate.findOne({ payrollPeriodId });
    if (existing) {
      const oldRates = { normalRate: existing.normalRate, otRate: existing.otRate, holidayRate: existing.holidayRate };
      existing.normalRate = data.normalRate;
      existing.otRate = data.otRate;
      existing.holidayRate = data.holidayRate;
      existing.setBy = userId as any;
      await existing.save();

      AuditService.log({
        userId,
        action: 'PAYROLL_RATES_UPDATE',
        entity: 'PayrollRate',
        entityId: (existing._id as any).toString(),
        oldValues: oldRates,
        newValues: data,
        ipAddress: auditCtx?.ip,
        userAgent: auditCtx?.ua,
      });
      eventBus.emit('hr.payroll.ratesUpdated', { payrollPeriodId, ...data });

      return existing;
    }

    const rate = await PayrollRate.create({ payrollPeriodId, ...data, setBy: userId });

    AuditService.log({
      userId,
      action: 'PAYROLL_RATES_CREATE',
      entity: 'PayrollRate',
      entityId: (rate._id as any).toString(),
      newValues: data,
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.payroll.ratesCreated', { payrollPeriodId, ...data });

    return rate;
  }

  static async getPayrollRates(payrollPeriodId: string) {
    return PayrollRate.findOne({ payrollPeriodId });
  }
}
