interface AuditCtx {
    ip?: string;
    ua?: string;
}
/**
 * STAFF PAYROLL ENTRIES — period-keyed overtime and bonus inputs.
 * Both are upserted per employee+period: entering again for the same month
 * replaces the value. Neither changes Guard Payroll in any way.
 */
export declare class StaffPayrollEntriesService {
    static listOvertime(filters?: {
        periodKey?: string;
        employeeId?: string;
    }): Promise<(import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffOvertimeEntry, {}, {}> & import("../../models/StaffPayrollEntries").IStaffOvertimeEntry & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static saveOvertime(input: {
        employeeId: string;
        periodKey: string;
        amount: number;
        hours?: number | null;
        notes?: string;
    }, userId: string, auditCtx?: AuditCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffOvertimeEntry, {}, {}> & import("../../models/StaffPayrollEntries").IStaffOvertimeEntry & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static cancelOvertime(id: string, userId: string, auditCtx?: AuditCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffOvertimeEntry, {}, {}> & import("../../models/StaffPayrollEntries").IStaffOvertimeEntry & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listBonuses(filters?: {
        periodKey?: string;
        employeeId?: string;
    }): Promise<(import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffBonus, {}, {}> & import("../../models/StaffPayrollEntries").IStaffBonus & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static saveBonus(input: {
        employeeId: string;
        periodKey: string;
        amount: number;
        label: string;
    }, userId: string, auditCtx?: AuditCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffBonus, {}, {}> & import("../../models/StaffPayrollEntries").IStaffBonus & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static cancelBonus(id: string, userId: string, auditCtx?: AuditCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/StaffPayrollEntries").IStaffBonus, {}, {}> & import("../../models/StaffPayrollEntries").IStaffBonus & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=staffPayrollEntries.service.d.ts.map