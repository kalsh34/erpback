"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardShiftController = void 0;
const guardShift_service_1 = require("./guardShift.service");
const ApiError_1 = require("../../../common/ApiError");
class GuardShiftController {
    /** POST /api/attendance/shifts/clock-in  { siteId } */
    static async clockIn(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const { siteId } = req.body || {};
            if (!siteId)
                throw ApiError_1.ApiError.badRequest('siteId is required — scan the site QR code first');
            const shift = await guardShift_service_1.GuardShiftService.clockIn(req.user.userId, siteId);
            res.status(201).json({ success: true, data: shift });
        }
        catch (error) {
            next(error);
        }
    }
    /** POST /api/attendance/shifts/clock-out */
    static async clockOut(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const result = await guardShift_service_1.GuardShiftService.clockOut(req.user.userId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    /** POST /api/attendance/shifts/patrol  { siteId } — QR patrol scan during an open shift. */
    static async patrol(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const { siteId } = req.body || {};
            if (!siteId || typeof siteId !== 'string')
                throw ApiError_1.ApiError.badRequest('siteId is required — scan the site QR code');
            const scan = await guardShift_service_1.GuardShiftService.recordPatrol(req.user.userId, siteId);
            res.status(201).json({ success: true, data: scan });
        }
        catch (error) {
            next(error);
        }
    }
    /** GET /api/attendance/shifts/site/:siteId — site details for the guard QR scanner. */
    static async scanSite(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const data = await guardShift_service_1.GuardShiftService.getScanSite(String(req.params.siteId));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /** GET /api/attendance/shifts/activity?from&to&siteId&employeeId — admin event monitor. */
    static async activity(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const ymd = /^\d{4}-\d{2}-\d{2}$/;
            const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
            const from = str(req.query.from);
            const to = str(req.query.to);
            if ((from && !ymd.test(from)) || (to && !ymd.test(to))) {
                throw ApiError_1.ApiError.badRequest('from and to must be YYYY-MM-DD');
            }
            const data = await guardShift_service_1.GuardShiftService.listActivity({
                from,
                to,
                siteId: str(req.query.siteId),
                employeeId: str(req.query.employeeId),
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /** GET /api/attendance/shifts/my — guard portal dashboard/shifts data. */
    static async my(req, res, next) {
        try {
            if (!req.user)
                return next(ApiError_1.ApiError.unauthorized());
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : 60;
            const data = await guardShift_service_1.GuardShiftService.getMyShifts(req.user.userId, limit);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardShiftController = GuardShiftController;
//# sourceMappingURL=guardShift.controller.js.map