import mongoose, { Document } from 'mongoose';
/**
 * A real guard shift captured from the guard portal: CLOCK IN opens the
 * shift, CLOCK OUT closes it and pushes the computed hours into the daily
 * GuardAttendanceRecord (source SELF_CLOCK) that payroll already consumes.
 *
 * One guard has at most ONE open shift at a time (unique partial index).
 */
export type GuardShiftStatus = 'OPEN' | 'CLOSED';
export interface IGuardShift extends Document {
    guardUserId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    /** Local calendar date (YYYY-MM-DD) of the CLOCK IN. */
    date: string;
    clockInAt: Date;
    clockOutAt?: Date;
    /** Hours worked, 2 decimals, computed at clock-out. */
    computedHours?: number;
    status: GuardShiftStatus;
    /** Daily attendance row created by the clock-out. */
    attendanceRecordId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardShift: mongoose.Model<IGuardShift, {}, {}, {}, mongoose.Document<unknown, {}, IGuardShift, {}, {}> & IGuardShift & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardShift.d.ts.map