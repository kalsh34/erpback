"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAttendanceController = void 0;
const staffAttendance_service_1 = require("./staffAttendance.service");
class StaffAttendanceController {
    static async saveDayStatus(req, res, next) {
        try {
            const record = await staffAttendance_service_1.StaffAttendanceService.saveDayStatus({ ...req.body, recordedBy: req.user?.userId || '' }, { ip: req.ip, ua: req.get('user-agent') });
            res.status(201).json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async bulkMarkDay(req, res, next) {
        try {
            const records = await staffAttendance_service_1.StaffAttendanceService.bulkMarkDay({ ...req.body, recordedBy: req.user?.userId || '' }, { ip: req.ip, ua: req.get('user-agent') });
            res.status(201).json({ success: true, data: records });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGrid(req, res, next) {
        try {
            const { year, month } = req.query;
            const result = await staffAttendance_service_1.StaffAttendanceService.getGrid(parseInt(year), parseInt(month));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMonthlySummary(req, res, next) {
        try {
            const { year, month } = req.query;
            const result = await staffAttendance_service_1.StaffAttendanceService.getMonthlySummary(parseInt(year), parseInt(month));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllPeriods(req, res, next) {
        try {
            const periods = await staffAttendance_service_1.StaffAttendanceService.getAllPeriods();
            res.json({ success: true, data: periods });
        }
        catch (error) {
            next(error);
        }
    }
    static async lockPeriod(req, res, next) {
        try {
            const { year, month, reason } = req.body;
            const period = await staffAttendance_service_1.StaffAttendanceService.lockPeriod(year, month, req.user?.userId || '', reason, {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
    static async unlockPeriod(req, res, next) {
        try {
            const { year, month, reason } = req.body;
            const period = await staffAttendance_service_1.StaffAttendanceService.unlockPeriod(year, month, req.user?.userId || '', reason, {
                ip: req.ip, ua: req.get('user-agent'),
            });
            res.json({ success: true, data: period });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.StaffAttendanceController = StaffAttendanceController;
//# sourceMappingURL=staffAttendance.controller.js.map