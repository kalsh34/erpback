import mongoose, { Document } from 'mongoose';
import { AttendanceSource, GuardAttendanceStatus } from '../types';
export interface IAttendanceChange {
    previousHours: number | null;
    newHours: number;
    reason?: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
}
/**
 * One guard's hours at ONE site on ONE calendar day.
 *
 * Site-specific by design: Guard A at Site Alpha and Guard A at Site Beta are
 * separate rows and are never merged — monthly totals are always computed as
 * SUM(hours) grouped by guard + site + calendar month (periodKey).
 *
 * Rows are never hard-deleted: a correction sets status = VOID (with who/why),
 * and a fresh ACTIVE row may then be recorded for the same guard+site+date.
 */
export interface IGuardAttendanceRecord extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    date: string;
    dayOfMonth: number;
    hoursWorked: number;
    isHoliday: boolean;
    periodKey: string;
    status: GuardAttendanceStatus;
    source: AttendanceSource;
    notes?: string;
    recordedBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    changeHistory: IAttendanceChange[];
    voidedBy?: mongoose.Types.ObjectId;
    voidedAt?: Date;
    voidReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardAttendanceRecord: mongoose.Model<IGuardAttendanceRecord, {}, {}, {}, mongoose.Document<unknown, {}, IGuardAttendanceRecord, {}, {}> & IGuardAttendanceRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardAttendanceRecord.d.ts.map