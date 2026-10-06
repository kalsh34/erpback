import mongoose, { Schema, Document } from 'mongoose';
import { AttendanceSource, StaffAttendanceStatus } from '../types';

/**
 * One staff member's attendance status for ONE calendar day of ONE month.
 * Periods are plain calendar months ("YYYY-MM" in periodKey) — the old
 * 26th→25th payroll-period model was removed with the legacy payroll.
 */
export interface IStaffAttendance extends Document {
  employeeId: mongoose.Types.ObjectId;
  periodKey: string; // "YYYY-MM"
  date: string; // YYYY-MM-DD
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
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayOfMonth: { type: Number, required: true },
    status: { type: String, enum: Object.values(StaffAttendanceStatus), required: true },
    leaveType: { type: String },
    notes: { type: String },
    source: { type: String, enum: Object.values(AttendanceSource), default: AttendanceSource.HR_MANUAL },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, collection: 'staff_attendance_v2' }
);

staffAttendanceSchema.index({ employeeId: 1, periodKey: 1, dayOfMonth: 1 }, { unique: true });
staffAttendanceSchema.index({ periodKey: 1 });

export const StaffAttendance = mongoose.model<IStaffAttendance>('StaffAttendance', staffAttendanceSchema);
