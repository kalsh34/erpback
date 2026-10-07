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