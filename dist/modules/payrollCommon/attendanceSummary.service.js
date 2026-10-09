"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceSummaryService = void 0;
exports.daysInMonth = daysInMonth;
const StaffAttendance_1 = require("../../models/StaffAttendance");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const monthlyHours_service_1 = require("../hr/guardAttendance/monthlyHours.service");
const types_1 = require("../../types");
/**
 * ATTENDANCE SUMMARY — read-only snapshots attached to payroll runs so Finance
 * can see how much each employee actually worked (or was absent) in the month
 * being paid, right next to the money lines.
 *
 * Guards: hours come from the same canonical feed payroll consumes
 * (GuardMonthlyHoursService.getPayrollHours — monthly sheets win, daily sums
 * fall back), so the summary always matches what was paid. A guard's
 * "absence" is standard monthly hours minus recorded hours.
 *
 * Staff: day-by-day status counts from staff attendance. Absent / unpaid
 * leave / half days are the deduction-relevant buckets.
 *
 * Suggested deduction amounts are hints only — what the unworked time was
 * worth at the employee's current rate. Finance always enters the final
 * figure as a PENALTY/OTHER deduction.
 */
const round2 = (n) => Math.round(n * 100) / 100;
function daysInMonth(periodKey) {
    const [y, m] = periodKey.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
class AttendanceSummaryService {
    /** One summary row per staff employee for a payroll month. */
    static async staffSummaries(periodKey, employeeIds, dayValueByEmployee = new Map()) {
        const dim = daysInMonth(periodKey);
        if (employeeIds.length === 0)
            return [];
        const records = await StaffAttendance_1.StaffAttendance.find({
            periodKey,
            employeeId: { $in: employeeIds },
        }).select('employeeId status');
        const byEmployee = new Map();
        for (const rec of records) {
            const key = rec.employeeId.toString();
            if (!byEmployee.has(key))
                byEmployee.set(key, new Map());
            const counts = byEmployee.get(key);
            counts.set(rec.status, (counts.get(rec.status) || 0) + 1);
        }
        return employeeIds.map((employeeId) => {
            const counts = byEmployee.get(employeeId) || new Map();
            const get = (s) => counts.get(s) || 0;
            const present = get(types_1.StaffAttendanceStatus.PRESENT);
            const absent = get(types_1.StaffAttendanceStatus.ABSENT);
            const unpaidLeave = get(types_1.StaffAttendanceStatus.UNPAID_LEAVE);
            const halfDay = get(types_1.StaffAttendanceStatus.HALF_DAY);
            const paidLeave = get(types_1.StaffAttendanceStatus.PAID_LEAVE);
            const sickLeave = get(types_1.StaffAttendanceStatus.SICK_LEAVE);
            const holiday = get(types_1.StaffAttendanceStatus.HOLIDAY);
            const weekend = get(types_1.StaffAttendanceStatus.WEEKEND);
            const marked = present + absent + paidLeave + unpaidLeave + sickLeave + halfDay + holiday + weekend;
            const workingDays = present + absent + halfDay + paidLeave + sickLeave;
            const attendanceRate = workingDays > 0 ? round2(((present + halfDay * 0.5) / workingDays) * 100) : 0;
            const absentDays = absent + unpaidLeave + halfDay * 0.5;
            // Suggestion: daily value of the basic salary × missed days.
            const dayValue = dayValueByEmployee.get(employeeId) || 0;
            const suggestedAmount = absentDays > 0 && dayValue > 0 ? round2(dayValue * absentDays) : null;
            return {
                employeeId,
                present,
                absent,
                paidLeave,
                unpaidLeave,
                sickLeave,
                halfDay,
                holiday,
                weekend,
                workingDays,
                attendanceRate,
                absentDays,
                hasAttendance: marked > 0,
                suggestedAmount,
            };
        });
    }
    /** One summary row per guard for a payroll month, from the canonical hours feed. */
    static async guardSummaries(periodKey, guardIds) {
        const [payrollHours, priorRecords] = await Promise.all([
            monthlyHours_service_1.GuardMonthlyHoursService.getPayrollHours(Number(periodKey.split('-')[0]), Number(periodKey.split('-')[1])),
            GuardPayrollRecord_1.GuardPayrollRecord.find({ periodKey }).select('employeeId primarySite.compensationAmount primarySite.standardMonthlyHours'),
        ]);
        const hoursByGuard = new Map(payrollHours.guards.map((g) => [g.guardId, g]));
        // Standard hours + site compensation from the latest prior record (same site setup payroll used).
        const priorByGuard = new Map();
        for (const rec of priorRecords) {
            const empId = rec.employeeId?.toString();
            if (!empId || priorByGuard.has(empId))
                continue;
            priorByGuard.set(empId, {
                comp: rec.primarySite?.compensationAmount || 0,
                std: rec.primarySite?.standardMonthlyHours || 240,
            });
        }
        return guardIds.map((guardId) => {
            const hours = hoursByGuard.get(guardId);
            const prior = priorByGuard.get(guardId);
            const std = prior?.std || 240;
            const normalHours = round2(hours?.totals.normalHours || 0);
            const holidayHours = round2(hours?.totals.holidayHours || 0);
            const sundayHours = round2(hours?.totals.sundayHours || 0);
            const totalHours = round2(normalHours + holidayHours + sundayHours);
            const source = hours?.source || 'NONE';
            const shortfall = Math.max(0, std - totalHours);
            const comp = prior?.comp || 0;
            const otRate = comp > 0 ? comp / 240 : 0;
            const suggestedAmount = shortfall > 0 && otRate > 0 ? round2(otRate * shortfall) : null;
            return {
                employeeId: guardId,
                source,
                normalHours,
                holidayHours,
                sundayHours,
                totalHours,
                standardMonthlyHours: std,
                percentageOfStandard: std > 0 ? round2((totalHours / std) * 100) : null,
                hasAttendance: !!hours,
                suggestedAmount,
            };
        });
    }
    /**
     * Attendance summary for one payroll run. For staff, dayValueByEmployee maps
     * employeeId → daily basic value (basic ÷ days in month) used for suggestions.
     */
    static async forRun(kind, periodKey, employeeIds, dayValueByEmployee) {
        const rows = kind === 'STAFF'
            ? await this.staffSummaries(periodKey, employeeIds, dayValueByEmployee)
            : await this.guardSummaries(periodKey, employeeIds);
        return {
            periodKey,
            daysInMonth: daysInMonth(periodKey),
            kind,
            rows,
        };
    }
}
exports.AttendanceSummaryService = AttendanceSummaryService;
//# sourceMappingURL=attendanceSummary.service.js.map