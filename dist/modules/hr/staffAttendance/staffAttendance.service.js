"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffAttendanceService = void 0;
const StaffAttendance_1 = require("../../../models/StaffAttendance");
const PayrollPeriod_1 = require("../../../models/PayrollPeriod");
const Employee_1 = require("../../../models/Employee");
const ApiError_1 = require("../../../common/ApiError");
const types_1 = require("../../../types");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class StaffAttendanceService {
    static async saveDayStatus(data, auditCtx) {
        const period = await this.getOrCreatePeriod(data.year, data.month);
        if (period.status === types_1.PayrollPeriodStatus.LOCKED) {
            throw ApiError_1.ApiError.forbidden('This period is locked. Finance must unlock it before changes can be made.');
        }
        const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.dayOfMonth).padStart(2, '0')}`;
        const existing = await StaffAttendance_1.StaffAttendance.findOne({
            employeeId: data.employeeId,
            payrollPeriodId: period._id,
            dayOfMonth: data.dayOfMonth,
        });
        let record;
        if (existing) {
            const oldStatus = existing.status;
            existing.status = data.status;
            existing.leaveType = data.leaveType;
            existing.notes = data.notes;
            existing.recordedBy = data.recordedBy;
            existing.source = 'HR_MANUAL';
            await existing.save();
            record = existing;
            AuditService_1.AuditService.log({
                userId: data.recordedBy,
                action: 'STAFF_ATTENDANCE_UPDATE',
                entity: 'StaffAttendance',
                entityId: existing._id.toString(),
                oldValues: { status: oldStatus },
                newValues: { status: data.status },
                ipAddress: auditCtx?.ip,
                userAgent: auditCtx?.ua,
            });
        }
        else {
            record = await StaffAttendance_1.StaffAttendance.create({
                employeeId: data.employeeId,
                payrollPeriodId: period._id,
                date: dateStr,
                dayOfMonth: data.dayOfMonth,
                status: data.status,
                leaveType: data.leaveType,
                notes: data.notes,
                recordedBy: data.recordedBy,
            });
            AuditService_1.AuditService.log({
                userId: data.recordedBy,
                action: 'STAFF_ATTENDANCE_CREATE',
                entity: 'StaffAttendance',
                entityId: record._id.toString(),
                newValues: { employeeId: data.employeeId, dayOfMonth: data.dayOfMonth, status: data.status },
                ipAddress: auditCtx?.ip,
                userAgent: auditCtx?.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.staffAttendance.dayMarked', { employeeId: data.employeeId, dayOfMonth: data.dayOfMonth, status: data.status });
        return record;
    }
    static async bulkMarkDay(data, auditCtx) {
        const period = await this.getOrCreatePeriod(data.year, data.month);
        if (period.status === types_1.PayrollPeriodStatus.LOCKED) {
            throw ApiError_1.ApiError.forbidden('This period is locked.');
        }
        const staff = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } });
        const results = [];
        for (const emp of staff) {
            const result = await this.saveDayStatus({
                employeeId: emp._id.toString(),
                year: data.year,
                month: data.month,
                dayOfMonth: data.dayOfMonth,
                status: data.status,
                recordedBy: data.recordedBy,
            }, auditCtx);
            results.push(result);
        }
        AuditService_1.AuditService.log({
            userId: data.recordedBy,
            action: 'STAFF_ATTENDANCE_BULK_MARK',
            entity: 'StaffAttendance',
            newValues: { dayOfMonth: data.dayOfMonth, status: data.status, count: results.length },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffAttendance.bulkMarked', { dayOfMonth: data.dayOfMonth, status: data.status, count: results.length });
        return results;
    }
    static async getGrid(year, month) {
        const period = await this.getOrCreatePeriod(year, month);
        const daysInMonth = new Date(year, month, 0).getDate();
        const staff = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } }).sort({ employeeCode: 1 });
        const records = await StaffAttendance_1.StaffAttendance.find({ payrollPeriodId: period._id });
        const recordMap = new Map();
        records.forEach((r) => {
            const key = `${r.employeeId}_${r.dayOfMonth}`;
            recordMap.set(key, r.status);
        });
        const grid = staff.map((emp) => {
            const days = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dayOfWeek = new Date(year, month - 1, d).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const key = `${emp._id}_${d}`;
                const status = recordMap.get(key) || null;
                days.push({ day: d, status, isWeekend });
            }
            return { employee: emp, days };
        });
        return { period, daysInMonth, grid };
    }
    static async getMonthlySummary(year, month) {
        const period = await this.getOrCreatePeriod(year, month);
        const daysInMonth = new Date(year, month, 0).getDate();
        const staff = await Employee_1.Employee.find({ category: types_1.EmployeeCategory.OFFICE_STAFF, status: { $in: ['ACTIVE', 'CONTRACTED'] } }).sort({ employeeCode: 1 });
        const records = await StaffAttendance_1.StaffAttendance.find({ payrollPeriodId: period._id });
        const summaryMap = new Map();
        staff.forEach((emp) => {
            summaryMap.set(emp._id.toString(), {
                PRESENT: 0, ABSENT: 0, PAID_LEAVE: 0, UNPAID_LEAVE: 0,
                SICK_LEAVE: 0, HALF_DAY: 0, HOLIDAY: 0, WEEKEND: 0,
            });
        });
        records.forEach((r) => {
            const counts = summaryMap.get(r.employeeId.toString());
            if (counts && counts[r.status] !== undefined) {
                counts[r.status]++;
            }
        });
        const summaries = staff.map((emp) => {
            const counts = summaryMap.get(emp._id.toString());
            const payableDays = counts.PRESENT + counts.HOLIDAY + counts.PAID_LEAVE + counts.SICK_LEAVE + counts.WEEKEND + (counts.HALF_DAY * 0.5);
            return {
                employee: emp,
                counts,
                payableDays,
                totalDaysInMonth: daysInMonth,
            };
        });
        return { period, daysInMonth, summaries };
    }
    static async lockPeriod(year, month, userId, reason, auditCtx) {
        const period = await this.getOrCreatePeriod(year, month);
        if (period.status === types_1.PayrollPeriodStatus.LOCKED) {
            throw ApiError_1.ApiError.badRequest('Period is already locked');
        }
        const oldStatus = period.status;
        period.status = types_1.PayrollPeriodStatus.LOCKED;
        await period.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'PERIOD_LOCKED',
            entity: 'PayrollPeriod',
            entityId: period._id.toString(),
            oldValues: { status: oldStatus },
            newValues: { status: 'LOCKED', reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffAttendance.periodLocked', { periodId: period._id, year, month });
        return period;
    }
    static async unlockPeriod(year, month, userId, reason, auditCtx) {
        const period = await this.getOrCreatePeriod(year, month);
        if (period.status !== types_1.PayrollPeriodStatus.LOCKED) {
            throw ApiError_1.ApiError.badRequest('Period is not locked');
        }
        const oldStatus = period.status;
        period.status = types_1.PayrollPeriodStatus.OPEN;
        await period.save();
        AuditService_1.AuditService.log({
            userId,
            action: 'PERIOD_UNLOCKED',
            entity: 'PayrollPeriod',
            entityId: period._id.toString(),
            oldValues: { status: oldStatus },
            newValues: { status: 'OPEN', reason },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
        });
        EventBus_1.eventBus.emit('hr.staffAttendance.periodUnlocked', { periodId: period._id, year, month });
        return period;
    }
    static async getAllPeriods() {
        return PayrollPeriod_1.PayrollPeriod.find().sort({ year: -1, month: -1 });
    }
    static async getOrCreatePeriod(year, month) {
        let period = await PayrollPeriod_1.PayrollPeriod.findOne({ year, month });
        if (!period) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            period = await PayrollPeriod_1.PayrollPeriod.create({
                year, month, monthName: monthNames[month - 1],
                startDate: new Date(year, month - 1, 1),
                // End of the LAST day (23:59:59.999) so attendance on the final day is included
                endDate: new Date(year, month, 0, 23, 59, 59, 999),
                status: types_1.PayrollPeriodStatus.OPEN,
            });
        }
        return period;
    }
}
exports.StaffAttendanceService = StaffAttendanceService;
//# sourceMappingURL=staffAttendance.service.js.map