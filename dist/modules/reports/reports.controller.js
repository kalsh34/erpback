"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = void 0;
const reports_service_1 = require("./reports.service");
class ReportsController {
    static async getPayrollSummary(req, res, next) {
        try {
            const summary = await reports_service_1.ReportsService.getPayrollSummary(req.query.payrollPeriodId);
            res.json({ success: true, data: summary });
        }
        catch (error) {
            next(error);
        }
    }
    static async getSiteLaborCost(req, res, next) {
        try {
            const costs = await reports_service_1.ReportsService.getSiteLaborCost(req.query.payrollPeriodId);
            res.json({ success: true, data: costs });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPaymentHistory(req, res, next) {
        try {
            const { startDate, endDate, page, limit } = req.query;
            const result = await reports_service_1.ReportsService.getPaymentHistory({
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ReportsController = ReportsController;
//# sourceMappingURL=reports.controller.js.map