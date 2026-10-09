import { IAttendanceRecord } from '../../../models/AttendanceRecord';
import mongoose from 'mongoose';
export declare class AttendanceService {
    static clockIn(data: {
        guardId: string;
        siteId: string;
        isHoliday?: boolean;
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IAttendanceRecord>;
    static clockOut(guardId: string, data?: {
        declaredRelieverId?: string;
        declaredRelieverSiteId?: string;
    }, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IAttendanceRecord>;
    static overrideClockOut(recordId: string, reason: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IAttendanceRecord>;
    static getOnDutyGuardIds(siteId: string): Promise<string[]>;
    static checkCoverageAlert(siteId: string): Promise<{
        understaffed: boolean;
        overstaffed: boolean;
        onDuty: number;
        required: number;
    }>;
    static getActiveShift(guardId: string): Promise<IAttendanceRecord | null>;
    static getTodayRecord(guardId: string): Promise<IAttendanceRecord | null>;
    static getRecentRecords(guardId: string, days: number): Promise<IAttendanceRecord[]>;
    static getGuardHours(guardId: string, startDate: Date, endDate: Date): Promise<{
        totalHours: number;
        normalHours: number;
        holidayHours: number;
        records: (mongoose.Document<unknown, {}, IAttendanceRecord, {}, {}> & IAttendanceRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static editHours(recordId: string, data: {
        totalHours: number;
        reason: string;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IAttendanceRecord>;
    static getByGuardAndPeriod(guardId: string, startDate: Date, endDate: Date): Promise<IAttendanceRecord[]>;
    static getAllAttendance(startDate: Date, endDate: Date): Promise<IAttendanceRecord[]>;
    private static assertPeriodNotLocked;
    static manualEntry(data: {
        guardId: string;
        date: string;
        hoursWorked: number;
        siteId: string;
        isHoliday?: boolean;
        notes?: string;
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        record: IAttendanceRecord;
        flagged?: string;
    }>;
    static manualEntryBulk(data: {
        siteId: string;
        entries: {
            guardId: string;
            date: string;
            hoursWorked: number;
            siteId?: string;
            isHoliday?: boolean;
            notes?: string;
        }[];
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        results: {
            guardId: string;
            date: string;
            status: 'created' | 'skipped';
            reason?: string;
            flagged?: string;
            recordId?: string;
        }[];
        summary: {
            created: number;
            skipped: number;
        };
    }>;
    static correctManualEntry(recordId: string, data: {
        hoursWorked?: number;
        isHoliday?: boolean;
        notes?: string;
        reason: string;
    }, auditCtx: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IAttendanceRecord>;
}
//# sourceMappingURL=attendance.service.d.ts.map