"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const payrollPeriod_service_1 = require("./payrollPeriod.service");
const finance_service_1 = require("./finance.service");
class FinanceController {
    static async getAllPeriods(req, res, next) {
        try {
            const { year, status } = req.query;
            const periods = await payrollPeriod_service_1.PayrollPeriodService.getAll({ year: parseInt(year), status });
            res.json({ success: true, data: periods });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPeriodById(req, res, next) {
        try {
            const period = await payrollPeriod_service_1.PayrollPeriodService.getById(req.params.id);
            res.json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
    static async createPeriod(req, res, next) {
        try {
            const period = await payrollPeriod_service_1.PayrollPeriodService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
    static async updatePeriodStatus(req, res, next) {
        try {
            const period = await payrollPeriod_service_1.PayrollPeriodService.updateStatus(req.params.id, req.body.status, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
    static async lockPeriod(req, res, next) {
        try {
            const period = await payrollPeriod_service_1.PayrollPeriodService.lock(req.params.id, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
    static async setRates(req, res, next) {
        try {
            const rates = await finance_service_1.FinanceService.setPayrollRates(req.params.periodId, req.body, req.user?.userId || '', {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: rates });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRates(req, res, next) {
        try {
            const rates = await finance_service_1.FinanceService.getPayrollRates(req.params.periodId);
            res.json({ success: true, data: rates });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FinanceController = FinanceController;
//# sourceMappingURL=finance.controller.js.map