import { IStaffAttendance } from '../../../models/StaffAttendance';
import { StaffAttendanceStatus } from '../../../types';
export declare class StaffAttendanceService {
    static saveDayStatus(data: {
        employeeId: string;
        year: number;
        month: number;
        dayOfMonth: number;
        status: StaffAttendanceStatus;
        leaveType?: string;
        notes?: string;
        recordedBy: string;
    }, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffAttendance>;
    static bulkMarkDay(data: {
        year: number;
        month: number;
        dayOfMonth: number;
        status: StaffAttendanceStatus;
        recordedBy: string;
    }, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffAttendance[]>;
    static getGrid(year: number, month: number): Promise<{
        period: import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        daysInMonth: number;
        grid: {
            employee: import("mongoose").Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            };
            days: {
                day: number;
                status: StaffAttendanceStatus | null;
                isWeekend: boolean;
            }[];
        }[];
    }>;
    static getMonthlySummary(year: number, month: number): Promise<{
        period: import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        daysInMonth: number;
        summaries: {
            employee: import("mongoose").Document<unknown, {}, import("../../../models/Employee").IEmployee, {}, {}> & import("../../../models/Employee").IEmployee & Required<{
                _id: import("mongoose").Types.ObjectId;
            }> & {
                __v: number;
            };
            counts: Record<string, number>;
            payableDays: number;
            totalDaysInMonth: number;
        }[];
    }>;
    static lockPeriod(year: number, month: number, userId: string, reason: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static unlockPeriod(year: number, month: number, userId: string, reason: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAllPeriods(): Promise<(import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getOrCreatePeriod(year: number, month: number): Promise<import("mongoose").Document<unknown, {}, import("../../../models/PayrollPeriod").IPayrollPeriod, {}, {}> & import("../../../models/PayrollPeriod").IPayrollPeriod & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=staffAttendance.service.d.ts.map