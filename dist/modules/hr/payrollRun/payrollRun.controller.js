"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollRunController = void 0;
const payrollRun_service_1 = require("./payrollRun.service");
class PayrollRunController {
    static async getAll(req, res, next) {
        try {
            const { status, page, limit } = req.query;
            const result = await payrollRun_service_1.PayrollRunService.getAll({
                status,
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
            const run = await payrollRun_service_1.PayrollRunService.getById(req.params.id);
            res.json({ success: true, data: run });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const { name, runType, periodFrom, periodTo } = req.body;
            const run = await payrollRun_service_1.PayrollRunService.create({ name, runType, periodFrom, periodTo }, { userId: req.user?.userId || '', ip: req.ip, ua: req.get('user-agent') });
            res.status(201).json({ success: true, data: run });
        }
        catch (error) {
            next(error);
        }
    }
    static async approve(req, res, next) {
        try {
            const run = await payrollRun_service_1.PayrollRunService.approve(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: run });
        }
        catch (error) {
            next(error);
        }
    }
    static async markPaid(req, res, next) {
        try {
            const { paymentMethod, bankReference } = req.body || {};
            const run = await payrollRun_service_1.PayrollRunService.markPaid(req.params.id, { paymentMethod, bankReference }, { userId: req.user?.userId || '', ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: run });
        }
        catch (error) {
            next(error);
        }
    }
    static async remove(req, res, next) {
        try {
            await payrollRun_service_1.PayrollRunService.remove(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Payroll run deleted' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PayrollRunController = PayrollRunController;
//# sourceMappingURL=payrollRun.controller.js.map