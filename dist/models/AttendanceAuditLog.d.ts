import mongoose, { Document } from 'mongoose';
export interface IAttendanceAuditLog extends Document {
    attendanceRecordId: mongoose.Types.ObjectId;
    editedBy: mongoose.Types.ObjectId;
    oldValue: {
        clockIn?: Date;
        clockOut?: Date;
        totalHours: number;
    };
    newValue: {
        clockIn?: Date;
        clockOut?: Date;
        totalHours: number;
    };
    reason: string;
    createdAt: Date;
}
export declare const AttendanceAuditLog: mongoose.Model<IAttendanceAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAttendanceAuditLog, {}, {}> & IAttendanceAuditLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AttendanceAuditLog.d.ts.map