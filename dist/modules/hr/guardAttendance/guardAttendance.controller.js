"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardAttendanceController = void 0;
const guardAttendance_service_1 = require("./guardAttendance.service");
const rbac_1 = require("../../../middleware/rbac");
const types_1 = require("../../../types");
const ApiError_1 = require("../../../common/ApiError");
/** Advance entry is a configurable permission — not a free-for-all. */
function canEnterFuture(user) {
    return !!user && (0, rbac_1.hasPermission)(user.role, types_1.PERMISSIONS.GUARD_ATTENDANCE_FUTURE);
}
function sourceFor(user) {
    return user?.role === types_1.UserRole.OPERATIONS ? types_1.AttendanceSource.OPERATIONS_EDIT : types_1.AttendanceSource.HR_MANUAL;
}
class GuardAttendanceController {
    static async getConfig(_req, res, next) {
        try {
            res.json({ success: true, data: guardAttendance_service_1.GuardAttendanceService.getConfig() });
        }
        catch (error) {
            next(error);
        }
    }
    static async getDay(req, res, next) {
        try {
            const { siteId, date } = req.query;
            if (!siteId || !date)
                throw ApiError_1.ApiError.badRequest('siteId and date are required');
            const data = await guardAttendance_service_1.GuardAttendanceService.getDayRoster(siteId, date, {
                allowFuture: canEnterFuture(req.user),
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async saveDay(req, res, next) {
        try {
            const { siteId, date, entries } = req.body;
            const result = await guardAttendance_service_1.GuardAttendanceService.saveDay({
                siteId,
                date,
                entries,
                userId: req.user?.userId || '',
                allowFuture: canEnterFuture(req.user),
                source: sourceFor(req.user),
            }, { ip: req.ip, ua: req.get('user-agent') });
            res.status(result.failed.length > 0 ? 207 : 201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async voidRecord(req, res, next) {
        try {
            const record = await guardAttendance_service_1.GuardAttendanceService.voidRecord(req.params.id, req.body.reason, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: record });
        }
        catch (error) {
            next(error);
        }
    }
    static async getMonthly(req, res, next) {
        try {
            const { year, month, siteId } = req.query;
            const data = await guardAttendance_service_1.GuardAttendanceService.getMonthlyTotals(parseInt(year, 10), parseInt(month, 10), siteId ? siteId : undefined);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPayrollReadiness(req, res, next) {
        try {
            const { year, month } = req.query;
            const data = await guardAttendance_service_1.GuardAttendanceService.getPayrollReadiness(parseInt(year, 10), parseInt(month, 10));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async listRecords(req, res, next) {
        try {
            const { siteId, guardId, from, to, limit } = req.query;
            const data = await guardAttendance_service_1.GuardAttendanceService.listRecords({
                siteId: siteId ? siteId : undefined,
                guardId: guardId ? guardId : undefined,
                from: from,
                to: to,
                limit: limit ? parseInt(limit, 10) : undefined,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardAttendanceController = GuardAttendanceController;
//# sourceMappingURL=guardAttendance.controller.js.map