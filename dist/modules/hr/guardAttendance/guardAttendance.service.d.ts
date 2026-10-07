import { IGuardAttendanceRecord } from '../../../models/GuardAttendanceRecord';
import { EmployeeStatus, AttendanceSource } from '../../../types';
export interface AttendanceEntryInput {
    guardId: string;
    hoursWorked: number;
    isHoliday?: boolean;
    notes?: string;
}
export declare class GuardAttendanceService {
    /** Hard cap (rejects) vs expected-hours warning (never rejects). */
    static getConfig(): {
        maxDailyHours: number;
        expectedDailyHours: number;
    };
    private static parseDate;
    private static startOfDay;
    private static assertHours;
    private static assertGuardAndAssignment;
    /** A guard can never exceed the daily cap across ALL sites combined. */
    private static assertDayTotal;
    private static assertFuture;
    /**
     * Create or update ONE guard's hours at ONE site on ONE day.
     * Updates keep the previous hours in changeHistory (never overwritten silently).
     */
    static saveEntry(params: {
        siteId: string;
        date: string;
        entry: AttendanceEntryInput;
        userId: string;
        allowFuture?: boolean;
        source?: AttendanceSource;
    }, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        record: IGuardAttendanceRecord;
        created: boolean;
    }>;
    /**
     * Fast daily entry: save a whole site-day in one call. Individual failures are
     * reported per guard so one bad row never discards the rest of the sheet.
     */
    static saveDay(params: {
        siteId: string;
        date: string;
        entries: AttendanceEntryInput[];
        userId: string;
        allowFuture?: boolean;
        source?: AttendanceSource;
    }, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        saved: {
            guardId: string;
            record: IGuardAttendanceRecord;
        }[];
        failed: {
            guardId: string;
            message: string;
        }[];
    }>;
    /** Controlled correction: void (never hard-delete) with a reason and who did it. */
    static voidRecord(recordId: string, reason: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IGuardAttendanceRecord, {}, {}> & IGuardAttendanceRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Guards assigned to a site + their hours already recorded for that day. */
    static getDayRoster(siteId: string, date: string, opts?: {
        allowFuture?: boolean;
    }): Promise<{
        site: {
            _id: import("mongoose").Types.ObjectId;
            siteName: string;
            siteCode: string;
        };
        date: string;
        periodKey: string;
        config: {
            maxDailyHours: number;
            expectedDailyHours: number;
        };
        futureDate: boolean;
        editable: boolean;
        rows: ({
            guard: {
                _id: import("mongoose").Types.ObjectId;
                employeeCode: string;
                firstName: string;
                lastName: string;
                status: EmployeeStatus;
            };
            assignment: {
                _id: import("mongoose").Types.ObjectId;
                role: "GUARD" | "SUPERVISOR";
                isPrimary: boolean;
                effectiveFrom: Date;
                rate: number;
            };
            attendable: boolean;
            record: IGuardAttendanceRecord | null;
            otherSiteHours: number;
            otherSiteDetail: {
                siteName: string;
                hours: number;
            }[];
        } | null)[];
    }>;
    /**
     * Monthly totals: SUM(valid daily hours) grouped by GUARD + SITE + calendar
     * month. Sites are never merged; the primary site is flagged per guard.
     */
    static getMonthlyTotals(year: number, month: number, siteId?: string): Promise<{
        periodKey: string;
        config: {
            maxDailyHours: number;
            expectedDailyHours: number;
        };
        rows: any[];
        missingAttendance: {
            _id: import("mongoose").Types.ObjectId;
            employeeCode: string;
            firstName: string;
            lastName: string;
        }[];
        grandTotal: number;
    }>;
    /**
     * Guard → Site → Period → Total Hours feed consumed by payroll.
     * Only ACTIVE (validated, non-void) records inside the period range count.
     */
    static getSiteHoursForPeriod(periodStart: Date, periodEnd: Date, guardId?: any): Promise<{
        guardId: string;
        siteId: string;
        normalHours: number;
        holidayHours: number;
        dayCount: any;
    }[]>;
    /** Pre-payroll checks: missing attendance and assignment gaps. */
    static getPayrollReadiness(year: number, month: number): Promise<{
        periodKey: string;
        config: {
            maxDailyHours: number;
            expectedDailyHours: number;
        };
        guardsWithAttendance: number;
        missingAttendance: {
            _id: import("mongoose").Types.ObjectId;
            employeeCode: string;
            firstName: string;
            lastName: string;
        }[];
        issues: {
            guard: any;
            type: string;
            message: string;
        }[];
        ready: boolean;
    }>;
    /** Raw records for a date range (audit/history view). */
    static listRecords(filters: {
        siteId?: string;
        guardId?: string;
        from: string;
        to: string;
        limit?: number;
    }): Promise<(import("mongoose").Document<unknown, {}, IGuardAttendanceRecord, {}, {}> & IGuardAttendanceRecord & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
//# sourceMappingURL=guardAttendance.service.d.ts.map