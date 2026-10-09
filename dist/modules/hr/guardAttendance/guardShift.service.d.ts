import { IGuardShift } from '../../../models/GuardShift';
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
    /** Guard portal data: shifts, open shift, today's rows, month total. */
    static getMyShifts(userId: string, limit?: number): Promise<{
        shifts: (import("mongoose").Document<unknown, {}, IGuardShift, {}, {}> & IGuardShift & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
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