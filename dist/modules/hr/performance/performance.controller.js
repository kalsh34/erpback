"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceController = void 0;
const performance_service_1 = require("./performance.service");
class PerformanceController {
    static async getAll(req, res, next) {
        try {
            const { period, page, limit } = req.query;
            const result = await performance_service_1.PerformanceService.getAll({
                period: period,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 50,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getStats(_req, res, next) {
        try {
            const stats = await performance_service_1.PerformanceService.getStats();
            res.json({ success: true, data: stats });
        }
        catch (error) {
            next(error);
        }
    }
    static async getTopPerformers(_req, res, next) {
        try {
            const performers = await performance_service_1.PerformanceService.getTopPerformers();
            res.json({ success: true, data: performers });
        }
        catch (error) {
            next(error);
        }
    }
    static async getReviewsDue(_req, res, next) {
        try {
            const reviews = await performance_service_1.PerformanceService.getReviewsDue();
            res.json({ success: true, data: reviews });
        }
        catch (error) {
            next(error);
        }
    }
    static async createOrUpdate(req, res, next) {
        try {
            const record = await performance_service_1.PerformanceService.createOrUpdate(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PerformanceController = PerformanceController;
//# sourceMappingURL=performance.controller.js.map