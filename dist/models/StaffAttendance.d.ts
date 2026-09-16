import mongoose, { Document } from 'mongoose';
import { StaffAttendanceStatus, AttendanceSource } from '../types';
export interface IStaffAttendance extends Document {
    employeeId: mongoose.Types.ObjectId;
    payrollPeriodId: mongoose.Types.ObjectId;
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