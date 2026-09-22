"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollRunService = void 0;
const PayrollRun_1 = require("../../../models/PayrollRun");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const GuardPayrollRecord_1 = require("../../../models/GuardPayrollRecord");
const StaffPayrollRecord_1 = require("../../../models/StaffPayrollRecord");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class PayrollRunService {
    static async getAll(query) {
        const { status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.status = status;
        const [runs, total] = await Promise.all([
            PayrollRun_1.PayrollRun.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('periodFrom')
                .populate('periodTo'),
            PayrollRun_1.PayrollRun.countDocuments(filter),
        ]);
        return { data: runs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const run = await PayrollRun_1.PayrollRun.findById(id).populate('periodFrom').populate('periodTo');
        if (!run)
            throw ApiError_1.ApiError.notFound('Payroll run not found');
        return run;
    }
    /**
     * Create a payroll run. Supports either a single period (periodFrom only)
     * or a period range (periodFrom -> periodTo). All periods between the two
     * (inclusive, sorted by year then month) are resolved into periodIds.
     */
    static async create(data, auditCtx) {
        if (!data.periodFrom)
            throw ApiError_1.ApiError.badRequest('periodFrom is required');
        if (data.periodTo && data.periodTo === data.periodFrom) {
            delete data.periodTo; // treat identical from/to as a single period
        }
        const from = await PayrollPeriod_1.PayrollPeriod.findById(data.periodFrom);
        if (!from)
            throw ApiError_1.ApiError.badRequest('Period (from) not found');
        let periods = [from];
        if (data.periodTo) {
            const to = await PayrollPeriod_1.PayrollPeriod.findById(data.periodTo);
            if (!to)
                throw ApiError_1.ApiError.badRequest('Period (to) not found');
            const all = await PayrollPeriod_1.PayrollPeriod.find().sort({ year: 1, month: 1 });
            const startIdx = all.findIndex((p) => p.year > from.year || (p.year === from.year && p.month >= from.month));
            const endIdx = all.findIndex((p) => p.year > to.year || (p.year === to.year && p.month >= to.month));
            if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
                throw ApiError_1.ApiError.badRequest('Invalid period range: end must be after start');
            }
            periods = all.slice(startIdx, endIdx + 1);
        }
        const label = periods.length === 1
            ? `${periods[0].monthName} ${periods[0].year}`
            : `${periods[0].monthName} ${periods[0].year} - ${periods[periods.length - 1].monthName} ${periods[periods.length - 1].year}`;
        const periodObjectIds = periods.map((p) => p._id);
        const runType = data.runType || 'ALL';
        const guardFilter = { payrollPeriodId: { $in: periodObjectIds } };
        const staffFilter = { payrollPeriodId: { $in: periodObjectIds } };
        let guardRecords = [];
        let staffRecords = [];
        if (runType === 'ALL' || runType === 'GUARD') {
            guardRecords = await GuardPayrollRecord_1.GuardPayrollRecord.find(guardFilter);
        }
        if (runType === 'ALL' || runType === 'STAFF') {
            staffRecords = await StaffPayrollRecord_1.StaffPayrollRecord.find(staffFilter);
        }
        const totalGross = guardRecords.reduce((s, r) => s + (r.grossPay || 0), 0) +
            staffRecords.reduce((s, r) => s + (r.grossSalary || 0), 0);
        const totalNet = guardRecords.reduce((s, r) => s + (r.netPay || 0), 0) +
            staffRecords.reduce((s, r) => s + (r.netPay || 0), 0);
        const run = await PayrollRun_1.PayrollRun.create({
            name: data.name,
            runType,
            periodFrom: periods[0]._id,
            periodTo: periods.length > 1 ? periods[periods.length - 1]._id : undefined,
            periodIds: periodObjectIds,
            periodLabel: label,
            status: PayrollRun_1.PayrollRunStatus.DRAFT,
            totalGross,
            totalNet,
            employeeCount: guardRecords.length + staffRecords.length,
            createdBy: auditCtx?.userId,
        });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'PAYROLL_RUN_CREATE',
                entity: 'PayrollRun',
                entityId: run._id.toString(),
                newValues: { name: run.name, periodLabel: label, status: run.status },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('payroll.run.created', { runId: run._id.toString() });
        return run;
    }
    static async approve(id, auditCtx) {
        const run = await PayrollRun_1.PayrollRun.findById(id);
        if (!run)
            throw ApiError_1.ApiError.notFound('Payroll run not found');
        if (run.status !== PayrollRun_1.PayrollRunStatus.DRAFT) {
            throw ApiError_1.ApiError.badRequest('Only DRAFT payroll runs can be approved');
        }
        run.status = PayrollRun_1.PayrollRunStatus.APPROVED;
        run.approvedBy = auditCtx?.userId;
        run.approvedAt = new Date();
        await run.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'PAYROLL_RUN_APPROVE',
                entity: 'PayrollRun',
                entityId: id,
                newValues: { status: run.status },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('payroll.run.approved', { runId: id });
        return run;
    }
    static async markPaid(id, data, auditCtx) {
        const run = await PayrollRun_1.PayrollRun.findById(id);
        if (!run)
            throw ApiError_1.ApiError.notFound('Payroll run not found');
        if (run.status !== PayrollRun_1.PayrollRunStatus.APPROVED) {
            throw ApiError_1.ApiError.badRequest('Only APPROVED payroll runs can be marked as paid');
        }
        run.status = PayrollRun_1.PayrollRunStatus.PAID;
        run.paidBy = auditCtx?.userId;
        run.paidAt = new Date();
        run.paymentMethod = data.paymentMethod || run.paymentMethod;
        run.bankReference = data.bankReference || run.bankReference;
        await run.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'PAYROLL_RUN_PAID',
                entity: 'PayrollRun',
                entityId: id,
                newValues: { status: run.status, paymentMethod: run.paymentMethod },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('payroll.run.paid', { runId: id });
        return run;
    }
    static async remove(id, auditCtx) {
        const run = await PayrollRun_1.PayrollRun.findById(id);
        if (!run)
            throw ApiError_1.ApiError.notFound('Payroll run not found');
        if (run.status !== PayrollRun_1.PayrollRunStatus.DRAFT) {
            throw ApiError_1.ApiError.badRequest('Only DRAFT payroll runs can be deleted');
        }
        await run.deleteOne();
        if (auditCtx) {
            AuditService_1.AuditService.log({
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
exports.PayrollRunService = PayrollRunService;
//# sourceMappingURL=payrollRun.service.js.map