"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendance_service_1 = require("./attendance.service");
class AttendanceController {
    static async clockIn(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.clockIn(req.body, {
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
    static async clockOut(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.clockOut(req.params.guardId, {
                declaredRelieverId: req.body.declaredRelieverId,
                declaredRelieverSiteId: req.body.declaredRelieverSiteId,
            }, {
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
    static async overrideClockOut(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.overrideClockOut(req.params.recordId, req.body.reason, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async getOnDuty(req, res, next) {
        try {
            const guardIds = await attendance_service_1.AttendanceService.getOnDutyGuardIds(req.params.siteId);
            res.json({ success: true, data: guardIds });
        }
        catch (error) {
            next(error);
        }
    }
    static async getCoverageAlerts(req, res, next) {
        try {
            const result = await attendance_service_1.AttendanceService.checkCoverageAlert(req.params.siteId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getActiveShift(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.getActiveShift(req.params.guardId);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async getTodayRecord(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.getTodayRecord(req.params.guardId);
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async getRecentRecords(req, res, next) {
        try {
            const days = parseInt(req.query.days) || 30;
            const records = await attendance_service_1.AttendanceService.getRecentRecords(req.params.guardId, days);
            res.json({ success: true, data: records });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuardHours(req, res, next) {
        try {
            const result = await attendance_service_1.AttendanceService.getGuardHours(req.params.guardId, new Date(req.query.startDate), new Date(req.query.endDate));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async editHours(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.editHours(req.params.id, req.body, req.user?.userId || '', {
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async getByGuardAndPeriod(req, res, next) {
        try {
            const records = await attendance_service_1.AttendanceService.getByGuardAndPeriod(req.params.guardId, new Date(req.query.startDate), new Date(req.query.endDate));
            res.json({ success: true, data: records });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllAttendance(req, res, next) {
        try {
            const records = await attendance_service_1.AttendanceService.getAllAttendance(new Date(req.query.startDate), new Date(req.query.endDate));
            res.json({ success: true, data: records });
        }
        catch (error) {
            next(error);
        }
    }
    static async manualEntry(req, res, next) {
        try {
            const result = await attendance_service_1.AttendanceService.manualEntry(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({
                success: true,
                data: result.record,
                flagged: result.flagged || undefined,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async manualEntryBulk(req, res, next) {
        try {
            const result = await attendance_service_1.AttendanceService.manualEntryBulk(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async correctManualEntry(req, res, next) {
        try {
            const record = await attendance_service_1.AttendanceService.correctManualEntry(req.params.id, req.body, {
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
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=attendance.controller.js.map