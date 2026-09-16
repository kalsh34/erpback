import mongoose, { Schema, Document } from 'mongoose';
import { AttendanceStatus, AttendanceSource } from '../types';

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

const attendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    isHoliday: { type: Boolean, default: false },
    source: { type: String, enum: Object.values(AttendanceSource), default: AttendanceSource.SYSTEM },
    filedById: { type: Schema.Types.ObjectId, ref: 'User' },
    filedAt: { type: Date },
    notes: { type: String },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    editReason: { type: String },
    declaredRelieverId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    declaredRelieverSiteId: { type: Schema.Types.ObjectId, ref: 'Site', default: null },
    overrideBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    overrideReason: { type: String },
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ guardId: 1, date: 1 });
attendanceRecordSchema.index({ siteId: 1, date: 1 });
attendanceRecordSchema.index({ siteId: 1, clockOut: 1 });
attendanceRecordSchema.index({ source: 1 });

export const AttendanceRecord = mongoose.model<IAttendanceRecord>(
  'AttendanceRecord',
  attendanceRecordSchema
);
