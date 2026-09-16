import mongoose, { Schema, Document } from 'mongoose';
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

const staffAttendanceSchema = new Schema<IStaffAttendance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    date: { type: String, required: true },
    dayOfMonth: { type: Number, required: true },
    status: { type: String, enum: Object.values(StaffAttendanceStatus), required: true },
    leaveType: { type: String, trim: true },
    notes: { type: String, trim: true },
    source: { type: String, enum: Object.values(AttendanceSource), default: AttendanceSource.HR_MANUAL },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ employeeId: 1, payrollPeriodId: 1, dayOfMonth: 1 }, { unique: true });
staffAttendanceSchema.index({ payrollPeriodId: 1 });

// Drop stale indexes from old schema
staffAttendanceSchema.on('index', () => {});

export const StaffAttendance = mongoose.model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema, 'staff_attendance_v2');
