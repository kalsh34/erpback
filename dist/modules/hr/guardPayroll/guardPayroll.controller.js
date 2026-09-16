"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollController = void 0;
const guardPayroll_service_1 = require("./guardPayroll.service");
class GuardPayrollController {
    static async getAll(req, res, next) {
        try {
            const { payrollPeriodId, status, page, limit } = req.query;
            const result = await guardPayroll_service_1.GuardPayrollService.getAll({
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
            const record = await guardPayroll_service_1.GuardPayrollService.getById(req.params.id);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async generateRecords(req, res, next) {
        try {
            const records = await guardPayroll_service_1.GuardPayrollService.generateRecords(req.params.periodId, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: records });
        }
        catch (error) {
            next(error);
        }
    }
    static async enterOt(req, res, next) {
        try {
            const record = await guardPayroll_service_1.GuardPayrollService.enterOt(req.params.id, req.body, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.calculate(req.params.id, {
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
            const record = await guardPayroll_service_1.GuardPayrollService.submit(req.params.id, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.check(req.params.id, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.approve(req.params.id, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.initiatePayment(req.params.id, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.confirmPaid(req.params.id, req.body, req.user?.userId || '', {
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
            const record = await guardPayroll_service_1.GuardPayrollService.returnForCorrection(req.params.id, req.user?.userId || '', req.body.reason, {
                ip: req.ip, ua: req.get('user-agent'),
            }, req.user?.role);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateHours(req, res, next) {
        try {
            const record = await guardPayroll_service_1.GuardPayrollService.updateHours(req.params.id, req.body, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardPayrollController = GuardPayrollController;
//# sourceMappingURL=guardPayroll.controller.js.map