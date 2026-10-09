"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollPeriodService = void 0;
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class PayrollPeriodService {
    static async getAll(query) {
        const filter = {};
        if (query.year)
            filter.year = query.year;
        if (query.status)
            filter.status = query.status;
        return PayrollPeriod_1.PayrollPeriod.find(filter).sort({ year: -1, month: -1 });
    }
    static async getById(id) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(id);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        return period;
    }
    static async create(data, auditCtx) {
        const existing = await PayrollPeriod_1.PayrollPeriod.findOne({ year: data.year, month: data.month });
        if (existing)
            throw ApiError_1.ApiError.conflict('Period already exists');
        const period = await PayrollPeriod_1.PayrollPeriod.create(data);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'PAYROLL_PERIOD_CREATE',
                entity: 'PayrollPeriod',
                entityId: period._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.payroll.periodCreated', { periodId: period._id, year: period.year, month: period.month });
        return period;
    }
    static async updateStatus(id, status, auditCtx) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(id);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        const allowedTransitions = {
            DRAFT: ['OPEN'],
            OPEN: ['CLOSED'],
            CLOSED: ['LOCKED'],
        };
        if (!allowedTransitions[period.status]?.includes(status)) {
            throw ApiError_1.ApiError.badRequest(`Cannot transition from ${period.status} to ${status}`);
        }
        const oldStatus = period.status;
        period.status = status;
        if (status === types_1.PayrollPeriodStatus.LOCKED) {
            period.lockedAt = new Date();
        }
        await period.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
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
        EventBus_1.eventBus.emit('hr.payroll.periodStatusChanged', { periodId: id, oldStatus, newStatus: status });
        return period;
    }
    static async lock(id, userId, auditCtx) {
        return this.updateStatus(id, types_1.PayrollPeriodStatus.LOCKED, { userId, ip: auditCtx?.ip, ua: auditCtx?.ua });
    }
}
exports.PayrollPeriodService = PayrollPeriodService;
//# sourceMappingURL=payrollPeriod.service.js.map