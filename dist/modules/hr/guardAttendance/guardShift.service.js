"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardShiftService = void 0;
const GuardShift_1 = require("../../../models/GuardShift");
const GuardAttendanceRecord_1 = require("../../../models/GuardAttendanceRecord");
const PrimarySiteAssignment_1 = require("../../../models/PrimarySiteAssignment");
const Employee_1 = require("../../../models/Employee");
const User_1 = require("../../../models/User");
const Site_1 = require("../../../models/Site");
const ApiError_1 = require("../../../common/ApiError");
const dateUtils_1 = require("../../../common/dateUtils");
const guardAttendance_service_1 = require("./guardAttendance.service");
const notification_service_1 = require("../../notifications/notification.service");
const types_1 = require("../../../types");
const ATTENDABLE_STATUSES = [types_1.EmployeeStatus.ACTIVE, types_1.EmployeeStatus.CONTRACTED];
const round2 = (n) => Math.round(n * 100) / 100;
class GuardShiftService {
    static async resolveGuard(userId) {
        const user = await User_1.User.findById(userId);
        if (!user)
            throw ApiError_1.ApiError.unauthorized('User not found');
        if (!user.employeeId) {
            throw ApiError_1.ApiError.badRequest('This login is not linked to an employee record — ask HR to link your account to a guard profile');
        }
        const guard = await Employee_1.Employee.findById(user.employeeId);
        if (!guard)
            throw ApiError_1.ApiError.notFound('Employee record not found');
        if (guard.category !== types_1.EmployeeCategory.GUARD) {
            throw ApiError_1.ApiError.badRequest('Only guards can clock in and out');
        }
        if (!ATTENDABLE_STATUSES.includes(guard.status)) {
            throw ApiError_1.ApiError.badRequest(`Your employment status (${guard.status}) does not allow clocking in`);
        }
        return { user, guard };
    }
    static async assertAssignment(employeeId, siteId) {
        const assignment = await PrimarySiteAssignment_1.PrimarySiteAssignment.findOne({ guardId: employeeId, siteId });
        if (!assignment)
            throw ApiError_1.ApiError.badRequest('You are not assigned to this site');
        if (!assignment.isCurrent)
            throw ApiError_1.ApiError.badRequest('Your assignment to this site has ended');
        return assignment;
    }
    static async notifyManagers(title, message, link, type) {
        try {
            await notification_service_1.NotificationService.createForPermission('guard-attendance.manage', { title, message, link, type });
        }
        catch {
            // Notification failures must never break the shift itself.
        }
    }
    /** CLOCK IN — opens a shift for the scanned site. */
    static async clockIn(userId, siteId) {
        const { guard } = await this.resolveGuard(userId);
        const site = await Site_1.Site.findById(siteId);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found — the QR code may be outdated');
        if (site.status !== 'ACTIVE')
            throw ApiError_1.ApiError.badRequest('This site is not active');
        await this.assertAssignment(guard._id, siteId);
        const open = await GuardShift_1.GuardShift.findOne({ guardUserId: userId, status: 'OPEN' });
        if (open) {
            throw ApiError_1.ApiError.badRequest('You already have an open shift — clock out before starting a new one');
        }
        const now = new Date();
        const shift = await GuardShift_1.GuardShift.create({
            guardUserId: userId,
            employeeId: guard._id,
            siteId,
            date: (0, dateUtils_1.ymdLocal)(now),
            clockInAt: now,
            status: 'OPEN',
        });
        const guardName = `${guard.firstName} ${guard.lastName}`;
        await this.notifyManagers('Guard clocked in', `${guardName} clocked in at ${site.siteName} (${site.siteCode}).`, '/attendance', 'INFO');
        return shift;
    }
    /** CLOCK OUT — closes the open shift and records the hours for payroll. */
    static async clockOut(userId) {
        const { guard } = await this.resolveGuard(userId);
        const shift = await GuardShift_1.GuardShift.findOne({ guardUserId: userId, status: 'OPEN' });
        if (!shift)
            throw ApiError_1.ApiError.badRequest('No open shift — clock in first');
        const now = new Date();
        const hours = round2((now.getTime() - shift.clockInAt.getTime()) / 3600000);
        if (hours <= 0) {
            throw ApiError_1.ApiError.badRequest('Shift is too short to record — clocked in less than a minute ago?');
        }
        // Push the real hours into the daily attendance row payroll consumes.
        // If HR/ops already entered an estimate for this guard+site+day, the row is
        // updated (previous value kept in changeHistory, source SELF_CLOCK).
        const { record } = await guardAttendance_service_1.GuardAttendanceService.saveEntry({
            siteId: shift.siteId.toString(),
            date: shift.date,
            entry: {
                guardId: guard._id.toString(),
                hoursWorked: hours,
                notes: `Self clock ${shift.clockInAt.toISOString()} → ${now.toISOString()}`,
            },
            userId,
            source: types_1.AttendanceSource.SELF_CLOCK,
        });
        shift.clockOutAt = now;
        shift.computedHours = hours;
        shift.status = 'CLOSED';
        shift.attendanceRecordId = record._id;
        await shift.save();
        const site = await Site_1.Site.findById(shift.siteId).select('siteName siteCode');
        const guardName = `${guard.firstName} ${guard.lastName}`;
        await this.notifyManagers('Guard clocked out', `${guardName} clocked out at ${site?.siteName || 'site'} — ${hours}h recorded.`, '/attendance', 'SUCCESS');
        return { shift, hours };
    }
    /** Guard portal data: shifts, open shift, today's rows, month total. */
    static async getMyShifts(userId, limit = 60) {
        const { guard } = await this.resolveGuard(userId).catch(() => ({ guard: null }));
        if (!guard) {
            return { shifts: [], openShift: null, todayRecords: [], monthHours: 0, periodKey: (0, dateUtils_1.ymdLocal)(new Date()).slice(0, 7) };
        }
        const today = (0, dateUtils_1.ymdLocal)(new Date());
        const periodKey = today.slice(0, 7);
        const [shifts, openShift, todayRecords] = await Promise.all([
            GuardShift_1.GuardShift.find({ guardUserId: userId }).sort({ clockInAt: -1 }).limit(Math.min(limit, 200))
                .populate('siteId', 'siteName siteCode location'),
            GuardShift_1.GuardShift.findOne({ guardUserId: userId, status: 'OPEN' })
                .populate('siteId', 'siteName siteCode location'),
            GuardAttendanceRecord_1.GuardAttendanceRecord.find({ guardId: guard._id, date: today, status: types_1.GuardAttendanceStatus.ACTIVE })
                .populate('siteId', 'siteName siteCode'),
        ]);
        const monthRecords = await GuardAttendanceRecord_1.GuardAttendanceRecord.find({
            guardId: guard._id,
            periodKey,
            status: types_1.GuardAttendanceStatus.ACTIVE,
        }).select('hoursWorked');
        const monthHours = round2(monthRecords.reduce((s, r) => s + r.hoursWorked, 0));
        return { shifts, openShift, todayRecords, monthHours, periodKey };
    }
}
exports.GuardShiftService = GuardShiftService;
//# sourceMappingURL=guardShift.service.js.map