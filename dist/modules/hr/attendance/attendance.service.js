"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const AttendanceRecord_1 = require("../../../models/AttendanceRecord");
const AttendanceAuditLog_1 = require("../../../models/AttendanceAuditLog");
const User_1 = require("../../../models/User");
const Site_1 = require("../../../models/Site");
const Employee_1 = require("../../../models/Employee");
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
const mongoose_1 = __importDefault(require("mongoose"));
class AttendanceService {
    static async clockIn(data, auditCtx) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeShift = await AttendanceRecord_1.AttendanceRecord.findOne({
            guardId: data.guardId,
            date: today,
            clockOut: null,
        });
        if (activeShift)
            throw ApiError_1.ApiError.conflict('You already have an active shift. Please clock out first.');
        // NOTE: the former 48-hour "relief" rule was REMOVED per developer decision.
        // It blocked the incoming reliever from clocking in after a handover, leaving
        // sites unguarded. A guard may now relieve a site immediately.
        {
            const onDutyCount = await AttendanceRecord_1.AttendanceRecord.countDocuments({
                siteId: data.siteId,
                date: today,
                clockOut: null,
            });
            if (onDutyCount === 0) {
                EventBus_1.eventBus.emit('hr.attendance.noPredecessorOnDuty', {
                    siteId: data.siteId,
                    guardId: data.guardId,
                });
            }
        }
        const record = await AttendanceRecord_1.AttendanceRecord.create({
            guardId: data.guardId,
            siteId: data.siteId,
            date: today,
            clockIn: new Date(),
            isHoliday: data.isHoliday || false,
        });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'ATTENDANCE_CLOCK_IN',
                entity: 'AttendanceRecord',
                entityId: record._id.toString(),
                newValues: {
                    guardId: data.guardId,
                    siteId: data.siteId,
                    clockIn: record.clockIn,
                },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.attendance.clockIn', {
            recordId: record._id,
            guardId: data.guardId,
            siteId: data.siteId,
        });
        await AttendanceService.checkCoverageAlert(data.siteId);
        return record;
    }
    static async clockOut(guardId, data, auditCtx) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const record = await AttendanceRecord_1.AttendanceRecord.findOne({
            guardId,
            date: today,
            clockOut: null,
        });
        if (!record)
            throw ApiError_1.ApiError.badRequest('No open shift to clock out from');
        record.clockOut = new Date();
        record.totalHours = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        if (data?.declaredRelieverId) {
            record.declaredRelieverId = new mongoose_1.default.Types.ObjectId(data.declaredRelieverId);
        }
        if (data?.declaredRelieverSiteId) {
            record.declaredRelieverSiteId = new mongoose_1.default.Types.ObjectId(data.declaredRelieverSiteId);
        }
        await record.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'ATTENDANCE_CLOCK_OUT',
                entity: 'AttendanceRecord',
                entityId: record._id.toString(),
                newValues: {
                    clockOut: record.clockOut,
                    totalHours: record.totalHours,
                    declaredRelieverId: data?.declaredRelieverId || null,
                    declaredRelieverSiteId: data?.declaredRelieverSiteId || null,
                },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.attendance.clockOut', {
            recordId: record._id,
            guardId,
            totalHours: record.totalHours,
            declaredRelieverId: data?.declaredRelieverId || null,
            declaredRelieverSiteId: data?.declaredRelieverSiteId || null,
        });
        await AttendanceService.checkCoverageAlert(record.siteId.toString());
        return record;
    }
    static async overrideClockOut(recordId, reason, userId, auditCtx) {
        const editor = await User_1.User.findById(userId);
        if (!editor)
            throw ApiError_1.ApiError.unauthorized('User not found');
        if (editor.role === types_1.UserRole.GUARD)
            throw ApiError_1.ApiError.forbidden('Guards cannot override clock-outs. Contact Operations.');
        const record = await AttendanceRecord_1.AttendanceRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Attendance record not found');
        if (record.clockOut)
            throw ApiError_1.ApiError.badRequest('This shift is already clocked out.');
        const oldValue = { clockIn: record.clockIn, clockOut: record.clockOut, totalHours: record.totalHours };
        record.clockOut = new Date();
        record.totalHours = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        record.overrideBy = userId;
        record.overrideReason = reason;
        record.source = types_1.AttendanceSource.OPERATIONS_EDIT;
        await record.save();
        await AttendanceAuditLog_1.AttendanceAuditLog.create({
            attendanceRecordId: record._id,
            editedBy: userId,
            oldValue,
            newValue: { clockOut: record.clockOut, totalHours: record.totalHours, overrideReason: reason },
            reason: `OPERATIONS OVERRIDE: ${reason}`,
        });
        AuditService_1.AuditService.log({
            userId,
            action: 'ATTENDANCE_OVERRIDE_CLOCK_OUT',
            entity: 'AttendanceRecord',
            entityId: recordId,
            oldValues: oldValue,
            newValues: { clockOut: record.clockOut, totalHours: record.totalHours, overrideReason: reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.attendance.overrideClockOut', {
            recordId,
            guardId: record.guardId.toString(),
            overrideBy: userId,
            reason,
        });
        await AttendanceService.checkCoverageAlert(record.siteId.toString());
        return record;
    }
    static async getOnDutyGuardIds(siteId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const records = await AttendanceRecord_1.AttendanceRecord.find({
            siteId,
            date: today,
            clockOut: null,
        }).select('guardId');
        return records.map((r) => r.guardId.toString());
    }
    static async checkCoverageAlert(siteId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const site = await Site_1.Site.findById(siteId);
        if (!site || site.agreedManpower === 0)
            return { understaffed: false, overstaffed: false, onDuty: 0, required: 0 };
        const onDuty = await AttendanceRecord_1.AttendanceRecord.countDocuments({
            siteId,
            date: today,
            clockOut: null,
        });
        const understaffed = onDuty < site.agreedManpower;
        const overstaffed = onDuty > site.agreedManpower;
        if (understaffed) {
            EventBus_1.eventBus.emit('hr.attendance.coverageAlert', {
                siteId,
                siteName: site.siteName,
                status: 'UNDERSTAFFED',
                onDuty,
                required: site.agreedManpower,
            });
        }
        else if (overstaffed) {
            EventBus_1.eventBus.emit('hr.attendance.coverageAlert', {
                siteId,
                siteName: site.siteName,
                status: 'OVERSTAFFED',
                onDuty,
                required: site.agreedManpower,
            });
        }
        return { understaffed, overstaffed, onDuty, required: site.agreedManpower };
    }
    static async getActiveShift(guardId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return AttendanceRecord_1.AttendanceRecord.findOne({ guardId, date: today, clockOut: null }).populate('siteId');
    }
    static async getTodayRecord(guardId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return AttendanceRecord_1.AttendanceRecord.findOne({ guardId, date: today }).sort({ clockIn: -1 }).populate('siteId');
    }
    static async getRecentRecords(guardId, days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        return AttendanceRecord_1.AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: -1, clockIn: -1 }).populate('siteId');
    }
    static async getGuardHours(guardId, startDate, endDate) {
        const records = await AttendanceRecord_1.AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('siteId');
        let totalHours = 0;
        let normalHours = 0;
        let holidayHours = 0;
        records.forEach((r) => {
            totalHours += r.totalHours;
            if (r.isHoliday)
                holidayHours += r.totalHours;
            else
                normalHours += r.totalHours;
        });
        return { totalHours, normalHours, holidayHours, records };
    }
    static async editHours(recordId, data, userId, auditCtx) {
        const editor = await User_1.User.findById(userId);
        if (!editor)
            throw ApiError_1.ApiError.unauthorized('Editor not found');
        if (editor.role === types_1.UserRole.GUARD)
            throw ApiError_1.ApiError.forbidden('Guards cannot modify attendance records. Contact HR or Operations for corrections.');
        const record = await AttendanceRecord_1.AttendanceRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Attendance record not found');
        const oldValue = { totalHours: record.totalHours, clockIn: record.clockIn, clockOut: record.clockOut };
        await AttendanceAuditLog_1.AttendanceAuditLog.create({
            attendanceRecordId: record._id,
            editedBy: userId,
            oldValue,
            newValue: { totalHours: data.totalHours },
            reason: data.reason,
        });
        record.totalHours = data.totalHours;
        record.source = types_1.AttendanceSource.OPERATIONS_EDIT;
        record.editReason = data.reason;
        record.editedBy = userId;
        await record.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'ATTENDANCE_EDIT_HOURS',
            entity: 'AttendanceRecord',
            entityId: recordId,
            oldValues: oldValue,
            newValues: { totalHours: data.totalHours, reason: data.reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.attendance.hoursEdited', { recordId, totalHours: data.totalHours, editedBy: userId });
        return record;
    }
    static async getByGuardAndPeriod(guardId, startDate, endDate) {
        return AttendanceRecord_1.AttendanceRecord.find({ guardId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('siteId');
    }
    static async getAllAttendance(startDate, endDate) {
        return AttendanceRecord_1.AttendanceRecord.find({ date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }).populate('guardId').populate('siteId');
    }
    static async assertPeriodNotLocked(date) {
        const period = await PayrollPeriod_1.PayrollPeriod.findOne({
            startDate: { $lte: date },
            endDate: { $gte: date },
        });
        if (period && (period.status === types_1.PayrollPeriodStatus.LOCKED || period.status === types_1.PayrollPeriodStatus.CLOSED)) {
            throw ApiError_1.ApiError.badRequest(`Payroll period ${period.monthName} ${period.year} is ${period.status.toLowerCase()}. ` +
                `Attendance cannot be ${date <= new Date() ? 'filed' : 'corrected'} for dates in a ${period.status.toLowerCase()} period. ` +
                `Use the RETURNED workflow to reopen the payroll record for this guard.`);
        }
    }
    static async manualEntry(data, auditCtx) {
        const guard = await Employee_1.Employee.findById(data.guardId);
        if (!guard)
            throw ApiError_1.ApiError.notFound('Guard not found');
        if (guard.category !== 'GUARD')
            throw ApiError_1.ApiError.badRequest('Employee is not a guard');
        if (guard.status !== types_1.EmployeeStatus.CONTRACTED) {
            throw ApiError_1.ApiError.badRequest('Guard must have an active contract before attendance can be filed');
        }
        const entryDate = new Date(data.date);
        entryDate.setHours(0, 0, 0, 0);
        const shiftAssignment = await ShiftAssignment_1.ShiftAssignment.findOne({
            guardId: data.guardId,
            siteId: data.siteId,
            status: 'ACTIVE',
            startDate: { $lte: entryDate },
            $or: [
                { endDate: { $gte: entryDate } },
                { endDate: { $exists: false } },
                { endDate: null },
            ],
        });
        if (!shiftAssignment) {
            throw ApiError_1.ApiError.badRequest(`No shift assignment found for this guard at this site on ${entryDate.toISOString().split('T')[0]} — assign a shift first.`);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (entryDate > today) {
            throw ApiError_1.ApiError.badRequest('Cannot file attendance for a future date');
        }
        const existing = await AttendanceRecord_1.AttendanceRecord.findOne({
            guardId: data.guardId,
            date: entryDate,
        });
        if (existing) {
            throw ApiError_1.ApiError.badRequest(`Attendance record already exists for this guard on ${entryDate.toISOString().split('T')[0]}. Use the update endpoint to correct it.`);
        }
        if (data.hoursWorked < 0 || data.hoursWorked > 24) {
            throw ApiError_1.ApiError.badRequest('Hours worked must be between 0 and 24');
        }
        await AttendanceService.assertPeriodNotLocked(entryDate);
        let flagged;
        if (data.hoursWorked > 16) {
            flagged = `Unusual hours: ${data.hoursWorked}h exceeds 16h standard day. Verify double shift or extended coverage.`;
        }
        const record = await AttendanceRecord_1.AttendanceRecord.create({
            guardId: data.guardId,
            siteId: data.siteId,
            date: entryDate,
            totalHours: data.hoursWorked,
            isHoliday: data.isHoliday || false,
            source: types_1.AttendanceSource.MANUAL_ENTRY,
            filedById: auditCtx.userId,
            filedAt: new Date(),
            notes: data.notes,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'ATTENDANCE_FILED',
            entity: 'AttendanceRecord',
            entityId: record._id.toString(),
            newValues: {
                guardId: data.guardId,
                siteId: data.siteId,
                date: entryDate,
                hoursWorked: data.hoursWorked,
                isHoliday: data.isHoliday || false,
                source: 'MANUAL_ENTRY',
            },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        EventBus_1.eventBus.emit('hr.attendance.manualEntry', {
            recordId: record._id,
            guardId: data.guardId,
            date: entryDate,
            hoursWorked: data.hoursWorked,
            filedBy: auditCtx.userId,
        });
        return { record, flagged };
    }
    static async manualEntryBulk(data, auditCtx) {
        const results = [];
        for (const entry of data.entries) {
            try {
                const result = await AttendanceService.manualEntry({
                    guardId: entry.guardId,
                    date: entry.date,
                    hoursWorked: entry.hoursWorked,
                    siteId: entry.siteId || data.siteId,
                    isHoliday: entry.isHoliday,
                    notes: entry.notes,
                }, auditCtx);
                results.push({
                    guardId: entry.guardId,
                    date: entry.date,
                    status: 'created',
                    flagged: result.flagged,
                    recordId: result.record._id.toString(),
                });
            }
            catch (err) {
                results.push({
                    guardId: entry.guardId,
                    date: entry.date,
                    status: 'skipped',
                    reason: err.message || 'Unknown error',
                });
            }
        }
        const created = results.filter((r) => r.status === 'created').length;
        const skipped = results.filter((r) => r.status === 'skipped').length;
        return { results, summary: { created, skipped } };
    }
    static async correctManualEntry(recordId, data, auditCtx) {
        const record = await AttendanceRecord_1.AttendanceRecord.findById(recordId);
        if (!record)
            throw ApiError_1.ApiError.notFound('Attendance record not found');
        if (record.source !== types_1.AttendanceSource.MANUAL_ENTRY) {
            throw ApiError_1.ApiError.badRequest('Cannot correct a self-clock record through this endpoint. Use the override endpoint for self-clock corrections.');
        }
        await AttendanceService.assertPeriodNotLocked(new Date(record.date));
        const oldValue = {
            totalHours: record.totalHours,
            isHoliday: record.isHoliday,
            notes: record.notes,
        };
        if (data.hoursWorked !== undefined) {
            if (data.hoursWorked < 0 || data.hoursWorked > 24) {
                throw ApiError_1.ApiError.badRequest('Hours worked must be between 0 and 24');
            }
            record.totalHours = data.hoursWorked;
        }
        if (data.isHoliday !== undefined)
            record.isHoliday = data.isHoliday;
        if (data.notes !== undefined)
            record.notes = data.notes;
        await record.save();
        await AttendanceAuditLog_1.AttendanceAuditLog.create({
            attendanceRecordId: record._id,
            editedBy: auditCtx.userId,
            oldValue,
            newValue: {
                totalHours: record.totalHours,
                isHoliday: record.isHoliday,
                notes: record.notes,
            },
            reason: `MANUAL_ENTRY CORRECTION: ${data.reason}`,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'ATTENDANCE_CORRECTED',
            entity: 'AttendanceRecord',
            entityId: recordId,
            oldValues: oldValue,
            newValues: {
                totalHours: record.totalHours,
                isHoliday: record.isHoliday,
                notes: record.notes,
                reason: data.reason,
            },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        EventBus_1.eventBus.emit('hr.attendance.manualEntryCorrected', {
            recordId,
            guardId: record.guardId.toString(),
            correctedBy: auditCtx.userId,
            reason: data.reason,
        });
        return record;
    }
}
exports.AttendanceService = AttendanceService;
//# sourceMappingURL=attendance.service.js.map