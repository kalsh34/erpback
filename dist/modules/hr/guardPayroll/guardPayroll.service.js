"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollService = void 0;
const GuardPayrollRecord_1 = require("../../../models/GuardPayrollRecord");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const PayrollApproval_1 = require("../../../models/PayrollApproval");
const payrollCalculation_service_1 = require("../finance/payrollCalculation.service");
const payrollJournal_service_1 = require("../../finance-accounting/payrollJournal.service");
const journal_service_1 = require("../../finance-accounting/journal.service");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class GuardPayrollService {
    static async getAll(query) {
        const { payrollPeriodId, status, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (payrollPeriodId)
            filter.payrollPeriodId = payrollPeriodId;
        if (status)
            filter.status = status;
        const [records, total] = await Promise.all([
            GuardPayrollRecord_1.GuardPayrollRecord.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('guardId')
                .populate('primarySiteId')
                .populate('payrollPeriodId'),
            GuardPayrollRecord_1.GuardPayrollRecord.countDocuments(filter),
        ]);
        return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(id)
            .populate('guardId')
            .populate('primarySiteId')
            .populate('payrollPeriodId');
        if (!record)
            throw ApiError_1.ApiError.notFound('Guard payroll record not found');
        return record;
    }
    static async generateRecords(payrollPeriodId, auditCtx) {
        const period = await PayrollPeriod_1.PayrollPeriod.findById(payrollPeriodId);
        if (!period)
            throw ApiError_1.ApiError.notFound('Payroll period not found');
        // Developer decision: guard payroll (like staff payroll) may only be generated
        // once the period is LOCKED. This removes the OPEN-vs-LOCKED conflict between
        // the two payroll modules.
        if (period.status !== 'LOCKED') {
            throw ApiError_1.ApiError.badRequest('Period must be LOCKED before generating guard payroll. Please lock the period first.');
        }
        const records = await payrollCalculation_service_1.PayrollCalculationService.generateGuardPayrollRecords(payrollPeriodId);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARD_PAYROLL_GENERATE',
                entity: 'GuardPayrollRecord',
                newValues: { payrollPeriodId, count: records.length },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.guardPayroll.generated', { payrollPeriodId, count: records.length });
        return records;
    }
    static async enterOt(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED');
        }
        const old = { regularOtHours: record.regularOtHours, holidayOtHours: record.holidayOtHours };
        if (data.regularOtHours !== undefined)
            record.regularOtHours = data.regularOtHours;
        if (data.holidayOtHours !== undefined)
            record.holidayOtHours = data.holidayOtHours;
        await record.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_ENTER_OT',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            oldValues: old,
            newValues: data,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.otEntered', { recordId });
        return record;
    }
    static async calculate(recordId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED');
        }
        const calculated = await payrollCalculation_service_1.PayrollCalculationService.calculateGuardPayroll(recordId);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARD_PAYROLL_CALCULATE',
                entity: 'GuardPayrollRecord',
                entityId: recordId,
                newValues: { netPay: calculated.netPay, grossPay: calculated.grossPay },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.guardPayroll.calculated', { recordId, netPay: calculated.netPay });
        return calculated;
    }
    static async submit(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CALCULATED && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be CALCULATED or RETURNED');
        }
        record.status = types_1.PayrollRecordStatus.SUBMITTED;
        record.submittedBy = userId;
        record.submittedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'SUBMITTED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_SUBMIT',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.submitted', { recordId });
        return record;
    }
    static async check(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.SUBMITTED) {
            throw ApiError_1.ApiError.badRequest('Record must be SUBMITTED');
        }
        record.status = types_1.PayrollRecordStatus.CHECKED;
        record.checkedBy = userId;
        record.checkedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'CHECKED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_CHECK',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.checked', { recordId });
        return record;
    }
    static async approve(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CHECKED) {
            throw ApiError_1.ApiError.badRequest('Record must be CHECKED');
        }
        record.status = types_1.PayrollRecordStatus.APPROVED;
        record.approvedBy = userId;
        record.approvedAt = new Date();
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'APPROVED',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_APPROVE',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.approved', { recordId });
        return record;
    }
    static async initiatePayment(recordId, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.APPROVED) {
            throw ApiError_1.ApiError.badRequest('Record must be APPROVED');
        }
        record.status = types_1.PayrollRecordStatus.PAYMENT_PROCESSING;
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'PAYMENT_PROCESSING',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_INITIATE_PAYMENT',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        return record;
    }
    static async confirmPaid(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.PAYMENT_PROCESSING) {
            throw ApiError_1.ApiError.badRequest('Record must be PAYMENT_PROCESSING');
        }
        // Stage payment fields in memory only — nothing is persisted until the
        // journal and loan side-effects below both succeed. Standalone MongoDB has
        // no multi-document transactions, so ordering + compensation is the
        // atomicity mechanism: journal first, loan second, PAID flip last.
        record.paymentMethod = data.paymentMethod;
        record.bankReference = data.bankReference;
        record.paymentDate = data.paymentDate;
        record.paidBy = userId;
        record.paidAt = new Date();
        const period = await PayrollPeriod_1.PayrollPeriod.findById(record.payrollPeriodId);
        const periodLabel = period ? `${period.monthName} ${period.year}` : 'Unknown Period';
        // 1) Journal first. Throws on imbalance/validation — the record is untouched
        // in the DB, so a failed journal can never leave a silent PAID-with-no-entry.
        const journalEntry = await payrollJournal_service_1.PayrollJournalService.postGuardPayroll(record, periodLabel, userId, auditCtx);
        // 2) Loan ledger mutation (moved here from generation so abandoned drafts
        // never move money). Same basis as the generation snapshot: period end.
        try {
            const guardId = record.guardId?._id || record.guardId;
            await payrollCalculation_service_1.PayrollCalculationService.applyLoanRepayment(guardId, record.loanDeduction, period?.endDate || record.paymentDate);
        }
        catch (loanErr) {
            // Compensate: void the just-posted journal so the ledger has no orphan,
            // then surface the original failure.
            try {
                await journal_service_1.JournalService.voidEntry(journalEntry._id.toString(), 'Loan repayment failed after journal posting — auto-voided to keep payment atomic', userId, auditCtx);
            }
            catch (voidErr) {
                console.error('[GuardPayroll] Failed to void journal after loan failure:', voidErr);
            }
            throw loanErr;
        }
        // 3) Only now flip to PAID and persist everything together.
        record.status = types_1.PayrollRecordStatus.PAID;
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'PAID',
            performedBy: userId,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_PAY',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            newValues: { paymentMethod: data.paymentMethod, paymentDate: data.paymentDate },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.paid', { recordId });
        return record;
    }
    static async returnForCorrection(recordId, userId, reason, auditCtx, userRole) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.CHECKED && record.status !== types_1.PayrollRecordStatus.APPROVED) {
            throw ApiError_1.ApiError.badRequest('Record must be CHECKED or APPROVED');
        }
        // Separation of duties is enforced here, not just at the route gate:
        // Finance owns the CHECKED stage, so only Finance may return from it;
        // an APPROVED record has passed Finance, so only HEAD may return it.
        // (SUPER_ADMIN retains both as the break-glass role.)
        const allowedRoles = record.status === types_1.PayrollRecordStatus.CHECKED
            ? [types_1.UserRole.FINANCE_OFFICER, types_1.UserRole.SUPER_ADMIN]
            : [types_1.UserRole.HEAD, types_1.UserRole.SUPER_ADMIN];
        if (!userRole || !allowedRoles.includes(userRole)) {
            throw ApiError_1.ApiError.forbidden(record.status === types_1.PayrollRecordStatus.CHECKED
                ? 'Only Finance may return a CHECKED record for correction'
                : 'Only HEAD may return an APPROVED record for correction');
        }
        record.status = types_1.PayrollRecordStatus.RETURNED;
        record.returnedBy = userId;
        record.returnedAt = new Date();
        record.returnReason = reason;
        await record.save();
        await PayrollApproval_1.PayrollApproval.create({
            payrollRecordId: record._id,
            payrollType: 'GUARD',
            action: 'RETURNED',
            performedBy: userId,
            notes: reason,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_RETURN',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            newValues: { reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.guardPayroll.returned', { recordId, reason });
        return record;
    }
    static async updateHours(recordId, data, userId, auditCtx) {
        const record = await GuardPayrollRecord_1.GuardPayrollRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Record not found');
        if (record.status !== types_1.PayrollRecordStatus.DRAFT && record.status !== types_1.PayrollRecordStatus.RETURNED) {
            throw ApiError_1.ApiError.badRequest('Record must be DRAFT or RETURNED to edit');
        }
        const oldHours = { normalHours: record.normalHours, otHours: record.otHours, holidayHours: record.holidayHours };
        if (data.normalHours !== undefined)
            record.normalHours = data.normalHours;
        if (data.otHours !== undefined)
            record.otHours = data.otHours;
        if (data.holidayHours !== undefined)
            record.holidayHours = data.holidayHours;
        await record.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'GUARD_PAYROLL_UPDATE_HOURS',
            entity: 'GuardPayrollRecord',
            entityId: recordId,
            oldValues: oldHours,
            newValues: data,
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        return record;
    }
}
exports.GuardPayrollService = GuardPayrollService;
//# sourceMappingURL=guardPayroll.service.js.map