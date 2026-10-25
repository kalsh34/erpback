import mongoose, { Document } from 'mongoose';
import { AttendanceSource, StaffAttendanceStatus } from '../types';
/**
 * One staff member's attendance status for ONE calendar day of ONE month.
 * Periods are plain calendar months ("YYYY-MM" in periodKey) — the old
 * 26th→25th payroll-period model was removed with the legacy payroll.
 */
export interface IStaffAttendance extends Document {
    employeeId: mongoose.Types.ObjectId;
    periodKey: string;
    date: string;
    dayOfMonth: number;
    status: StaffAttendanceStatus;
    leaveType?: string;
    notes?: string;
    source: AttendanceSource;
    recordedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const StaffAttendance: mongoose.Model<IStaffAttendance, {}, {}, {}, mongoose.Document<unknown, {}, IStaffAttendance, {}, {}> & IStaffAttendance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=StaffAttendance.d.ts.map