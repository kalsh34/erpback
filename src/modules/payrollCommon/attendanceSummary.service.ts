import { StaffAttendance } from '../../models/StaffAttendance';
import { GuardPayrollRecord } from '../../models/GuardPayrollRecord';
import { EmployeeDeduction } from '../../models/EmployeeDeduction';
import { GuardMonthlyHoursService } from '../hr/guardAttendance/monthlyHours.service';
import { StaffAttendanceStatus } from '../../types';

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

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface StaffAttendanceSummary {
  employeeId: string;
  present: number;
  absent: number;
  paidLeave: number;
  unpaidLeave: number;
  sickLeave: number;
  halfDay: number;
  holiday: number;
  weekend: number;
  workingDays: number;
  attendanceRate: number;
  absentDays: number;
  hasAttendance: boolean;
  /** Suggested deduction for the missed time (basic salary per day × missed days). */
  suggestedAmount: number | null;
}

export interface GuardAttendanceSummary {
  employeeId: string;
  source: 'MONTHLY' | 'DAILY' | 'NONE';
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  totalHours: number;
  standardMonthlyHours: number | null;
  percentageOfStandard: number | null;
  hasAttendance: boolean;
  /** Suggested deduction for unworked hours (site OT rate × shortfall). */
  suggestedAmount: number | null;
}

export interface RunAttendanceSummary {
  periodKey: string;
  daysInMonth: number;
  kind: 'GUARD' | 'STAFF';
  rows: (StaffAttendanceSummary | GuardAttendanceSummary)[];
}

export function daysInMonth(periodKey: string): number {
  const [y, m] = periodKey.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export class AttendanceSummaryService {
  /** One summary row per staff employee for a payroll month. */
  static async staffSummaries(
    periodKey: string,
    employeeIds: string[],
    dayValueByEmployee: Map<string, number> = new Map()
  ): Promise<StaffAttendanceSummary[]> {
    const dim = daysInMonth(periodKey);
    if (employeeIds.length === 0) return [];

    const records = await StaffAttendance.find({
      periodKey,
      employeeId: { $in: employeeIds },
    }).select('employeeId status');

    const byEmployee = new Map<string, Map<string, number>>();
    for (const rec of records) {
      const key = rec.employeeId.toString();
      if (!byEmployee.has(key)) byEmployee.set(key, new Map());
      const counts = byEmployee.get(key)!;
      counts.set(rec.status, (counts.get(rec.status) || 0) + 1);
    }

    return employeeIds.map((employeeId) => {
      const counts = byEmployee.get(employeeId) || new Map<string, number>();
      const get = (s: StaffAttendanceStatus) => counts.get(s) || 0;
      const present = get(StaffAttendanceStatus.PRESENT);
      const absent = get(StaffAttendanceStatus.ABSENT);
      const unpaidLeave = get(StaffAttendanceStatus.UNPAID_LEAVE);
      const halfDay = get(StaffAttendanceStatus.HALF_DAY);
      const paidLeave = get(StaffAttendanceStatus.PAID_LEAVE);
      const sickLeave = get(StaffAttendanceStatus.SICK_LEAVE);
      const holiday = get(StaffAttendanceStatus.HOLIDAY);
      const weekend = get(StaffAttendanceStatus.WEEKEND);
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
  static async guardSummaries(periodKey: string, guardIds: string[]): Promise<GuardAttendanceSummary[]> {
    const [payrollHours, priorRecords] = await Promise.all([
      GuardMonthlyHoursService.getPayrollHours(Number(periodKey.split('-')[0]), Number(periodKey.split('-')[1])),
      GuardPayrollRecord.find({ periodKey }).select('employeeId primarySite.compensationAmount primarySite.standardMonthlyHours'),
    ]);

    const hoursByGuard = new Map(payrollHours.guards.map((g) => [g.guardId, g]));
    // Standard hours + site compensation from the latest prior record (same site setup payroll used).
    const priorByGuard = new Map<string, { comp: number; std: number }>();
    for (const rec of priorRecords) {
      const empId = rec.employeeId?.toString();
      if (!empId || priorByGuard.has(empId)) continue;
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
      const source: 'MONTHLY' | 'DAILY' | 'NONE' = hours?.source || 'NONE';

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
  static async forRun(
    kind: 'GUARD' | 'STAFF',
    periodKey: string,
    employeeIds: string[],
    dayValueByEmployee?: Map<string, number>
  ): Promise<RunAttendanceSummary> {
    const rows =
      kind === 'STAFF'
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
