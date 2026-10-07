"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardMonthlyHoursController = void 0;
const monthlyHours_service_1 = require("./monthlyHours.service");
const types_1 = require("../../../types");
const ApiError_1 = require("../../../common/ApiError");
function sourceFor(user) {
    return user?.role === 'OPERATIONS'
        ? types_1.AttendanceSource.OPERATIONS_EDIT
        : types_1.AttendanceSource.HR_MANUAL;
}
class GuardMonthlyHoursController {
    /** GET /api/attendance/monthly-sheet?year=&month=&siteId= */
    static async getSheet(req, res, next) {
        try {
            const { year, month, siteId } = req.query;
            if (!year || !month)
                throw ApiError_1.ApiError.badRequest('year and month are required');
            const data = await monthlyHours_service_1.GuardMonthlyHoursService.getMonthlySheet(parseInt(year, 10), parseInt(month, 10), siteId ? siteId : undefined);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    /** POST /api/attendance/monthly-sheet */
    static async saveSheet(req, res, next) {
        try {
            const { year, month, entries } = req.body;
            if (!year || !month)
                throw ApiError_1.ApiError.badRequest('year and month are required');
            const result = await monthlyHours_service_1.GuardMonthlyHoursService.saveMonthly({
                year: parseInt(year, 10),
                month: parseInt(month, 10),
                entries,
                userId: req.user?.userId || '',
                source: sourceFor(req.user),
            }, { ip: req.ip, ua: req.get('user-agent') });
            res.status(result.failed.length > 0 ? 207 : 201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    /** GET /api/attendance/monthly-sheet/payroll-hours?year=&month= */
    static async getPayrollHours(req, res, next) {
        try {
            const { year, month } = req.query;
            if (!year || !month)
                throw ApiError_1.ApiError.badRequest('year and month are required');
            const data = await monthlyHours_service_1.GuardMonthlyHoursService.getPayrollHours(parseInt(year, 10), parseInt(month, 10));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardMonthlyHoursController = GuardMonthlyHoursController;
//# sourceMappingURL=monthlyHours.controller.js.map