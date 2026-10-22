import { IGuardShift } from '../../../models/GuardShift';
import { IGuardPatrolScan } from '../../../models/GuardPatrolScan';
export declare class GuardShiftService {
    private static resolveGuard;
    private static assertAssignment;
    private static notifyManagers;
    /** CLOCK IN — opens a shift for the scanned site. */
    static clockIn(userId: string, siteId: string): Promise<IGuardShift>;
    /** CLOCK OUT — closes the open shift and records the hours for payroll. */
    static clockOut(userId: string): Promise<{
        shift: IGuardShift;
        hours: number;
    }>;
    /** Minimal site info for the guard scanner (guards have no SITE_READ permission). */
    static getScanSite(siteId: string): Promise<import("mongoose").Document<unknown, {}, import("../../../models/Site").ISite, {}, {}> & import("../../../models/Site").ISite & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** PATROL SCAN — the guard scans a site QR while on an open shift at that site. */
    static recordPatrol(userId: string, siteId: string): Promise<IGuardPatrolScan>;
    /** Admin view: shifts and patrol scans in a date range (YYYY-MM-DD, inclusive). */
    static listActivity(filters: {
        from?: string;
        to?: string;
        siteId?: string;
        employeeId?: string;
    }): Promise<{
        from: string;
        to: string;
        shifts: (import("mongoose").Document<unknown, {}, IGuardShift, {}, {}> & IGuardShift & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        patrols: (import("mongoose").Document<unknown, {}, IGuardPatrolScan, {}, {}> & IGuardPatrolScan & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    /** Guard portal data: shifts (with patrol counts), open shift, today's rows, month total. */
    static getMyShifts(userId: string, limit?: number): Promise<{
        shifts: {
            patrolCount: number;
            guardUserId: import("mongoose").Types.ObjectId;
            employeeId: import("mongoose").Types.ObjectId;
            siteId: import("mongoose").Types.ObjectId;
            date: string;
            clockInAt: Date;
            clockOutAt?: Date;
            computedHours?: number;
            status: import("../../../models/GuardShift").GuardShiftStatus;
            attendanceRecordId?: import("mongoose").Types.ObjectId;
            createdAt: Date;
            updatedAt: Date;
            _id: import("mongoose").Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            id?: any;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
        openShift: (import("mongoose").Document<unknown, {}, IGuardShift, {}, {}> & IGuardShift & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        }) | null;
        todayRecords: (import("mongoose").Document<unknown, {}, import("../../../models/GuardAttendanceRecord").IGuardAttendanceRecord, {}, {}> & import("../../../models/GuardAttendanceRecord").IGuardAttendanceRecord & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        monthHours: number;
        periodKey: string;
    }>;
}
//# sourceMappingURL=guardShift.service.d.ts.map