import mongoose, { Document } from 'mongoose';
import { AttendanceSource } from '../types';
export interface IAttendanceRecord extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    date: Date;
    clockIn?: Date;
    clockOut?: Date;
    totalHours: number;
    isHoliday: boolean;
    source: AttendanceSource;
    filedById?: mongoose.Types.ObjectId;
    filedAt?: Date;
    notes?: string;
    editedBy?: mongoose.Types.ObjectId;
    editReason?: string;
    declaredRelieverId?: mongoose.Types.ObjectId;
    declaredRelieverSiteId?: mongoose.Types.ObjectId;
    overrideBy?: mongoose.Types.ObjectId;
    overrideReason?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AttendanceRecord: mongoose.Model<IAttendanceRecord, {}, {}, {}, mongoose.Document<unknown, {}, IAttendanceRecord, {}, {}> & IAttendanceRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AttendanceRecord.d.ts.map