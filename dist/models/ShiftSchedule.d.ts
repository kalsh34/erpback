import mongoose, { Document } from 'mongoose';
/**
 * Shift Scheduling (redesigned replacement for the legacy "Rotation" model).
 *
 * A ShiftSchedule is a scheduling PLAN for one site: which guards are in the
 * pool, what the shift pattern looks like (12h day+night or single 24h duty)
 * and the date window the plan covers. The actual generated duties live in
 * the ScheduleAssignment collection, produced by the fair-rest algorithm in
 * shiftSchedule.service.ts.
 */
export type ShiftMode = 'STANDARD_12H' | 'SINGLE_24H';
export interface ISchedulePoolGuard {
    guardId: mongoose.Types.ObjectId;
    status: 'ACTIVE' | 'INACTIVE';
    order: number;
}
export interface IShiftSchedule extends Document {
    name: string;
    description?: string;
    siteId: mongoose.Types.ObjectId;
    guardPool: ISchedulePoolGuard[];
    /** Shared floaters: only used when the site pool cannot cover a slot at all. */
    floaterPool: ISchedulePoolGuard[];
    shiftMode: ShiftMode;
    /** Guards required on the day shift (12h mode) or on the 24h duty (24h mode). */
    dayCount: number;
    /** Guards required on the night shift (12h mode only). */
    nightCount: number;
    dayStartTime: string;
    dayEndTime: string;
    nightStartTime: string;
    nightEndTime: string;
    startDate: Date;
    endDate: Date;
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    lastGeneratedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftSchedule: mongoose.Model<IShiftSchedule, {}, {}, {}, mongoose.Document<unknown, {}, IShiftSchedule, {}, {}> & IShiftSchedule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ShiftSchedule.d.ts.map