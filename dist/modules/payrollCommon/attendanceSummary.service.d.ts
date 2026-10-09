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
export declare function daysInMonth(periodKey: string): number;
export declare class AttendanceSummaryService {
    /** One summary row per staff employee for a payroll month. */
    static staffSummaries(periodKey: string, employeeIds: string[], dayValueByEmployee?: Map<string, number>): Promise<StaffAttendanceSummary[]>;
    /** One summary row per guard for a payroll month, from the canonical hours feed. */
    static guardSummaries(periodKey: string, guardIds: string[]): Promise<GuardAttendanceSummary[]>;
    /**
     * Attendance summary for one payroll run. For staff, dayValueByEmployee maps
     * employeeId → daily basic value (basic ÷ days in month) used for suggestions.
     */
    static forRun(kind: 'GUARD' | 'STAFF', periodKey: string, employeeIds: string[], dayValueByEmployee?: Map<string, number>): Promise<RunAttendanceSummary>;
}
//# sourceMappingURL=attendanceSummary.service.d.ts.map