"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const PayrollRate_1 = require("../../../models/PayrollRate");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class FinanceService {
    static async setPayrollRates(payrollPeriodId, data, userId, auditCtx) {
        const existing = await PayrollRate_1.PayrollRate.findOne({ payrollPeriodId });
        if (existing) {
            const oldRates = { normalRate: existing.normalRate, otRate: existing.otRate, holidayRate: existing.holidayRate };
            existing.normalRate = data.normalRate;
            existing.otRate = data.otRate;
            existing.holidayRate = data.holidayRate;
            existing.setBy = userId;
            await existing.save();
            AuditService_1.AuditService.log({
                userId,
                action: 'PAYROLL_RATES_UPDATE',
                entity: 'PayrollRate',
                entityId: existing._id.toString(),
                oldValues: oldRates,
                newValues: data,
                ipAddress: auditCtx?.ip,
                userAgent: auditCtx?.ua,
            });
            EventBus_1.eventBus.emit('hr.payroll.ratesUpdated', { payrollPeriodId, ...data });
            return existing;
        }
        const rate = await PayrollRate_1.PayrollRate.create({ payrollPeriodId, ...data, setBy: userId });
        AuditService_1.AuditService.log({
            userId,
            action: 'PAYROLL_RATES_CREATE',
            entity: 'PayrollRate',
            entityId: rate._id.toString(),
            newValues: data,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.payroll.ratesCreated', { payrollPeriodId, ...data });
        return rate;
    }
    static async getPayrollRates(payrollPeriodId) {
        return PayrollRate_1.PayrollRate.findOne({ payrollPeriodId });
    }
}
exports.FinanceService = FinanceService;
//# sourceMappingURL=finance.service.js.map