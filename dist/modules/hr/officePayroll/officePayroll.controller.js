"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfficePayrollController = void 0;
const officePayroll_service_1 = require("./officePayroll.service");
const payrollCalculation_service_1 = require("../finance/payrollCalculation.service");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class OfficePayrollController {
    static async getAll(req, res, next) {
        try {
            const { payrollPeriodId, status, page, limit } = req.query;
            const result = await officePayroll_service_1.StaffPayrollService.getAll({
                payrollPeriodId, status,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.getById(req.params.id);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async generate(req, res, next) {
        try {
            const result = await payrollCalculation_service_1.PayrollCalculationService.generateStaffPayrollRecords(req.params.periodId);
            if (req.user) {
                AuditService_1.AuditService.log({
                    userId: req.user.userId,
                    action: 'OFFICE_PAYROLL_GENERATE',
                    entity: 'StaffPayrollRecord',
                    entityId: req.params.periodId,
                    newValues: { count: result.records.length, skippedCount: result.skipped.length },
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                });
            }
            EventBus_1.eventBus.emit('hr.officePayroll.recordsGenerated', { periodId: req.params.periodId, count: result.records.length });
            res.status(201).json({ success: true, data: result.records, skipped: result.skipped });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateSalaryInputs(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.updateSalaryInputs(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async enterOt(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.enterOt(req.params.id, req.body, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async calculate(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.calculate(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async submit(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.submit(req.params.id, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async check(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.check(req.params.id, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async approve(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.approve(req.params.id, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async initiatePayment(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.initiatePayment(req.params.id, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async confirmPaid(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.confirmPaid(req.params.id, req.body, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async returnForCorrection(req, res, next) {
        try {
            const record = await officePayroll_service_1.StaffPayrollService.returnForCorrection(req.params.id, req.user?.userId || '', req.body.reason, {
                ip: req.ip, ua: req.get('user-agent'),
            }, req.user?.role);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.OfficePayrollController = OfficePayrollController;
//# sourceMappingURL=officePayroll.controller.js.map