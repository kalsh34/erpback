import mongoose, { Schema, Document } from 'mongoose';

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

const attendanceAuditLogSchema = new Schema<IAttendanceAuditLog>(
  {
    attendanceRecordId: { type: Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
    editedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    oldValue: {
      clockIn: { type: Date },
      clockOut: { type: Date },
      totalHours: { type: Number },
    },
    newValue: {
      clockIn: { type: Date },
      clockOut: { type: Date },
      totalHours: { type: Number },
    },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

attendanceAuditLogSchema.index({ attendanceRecordId: 1 });

export const AttendanceAuditLog = mongoose.model<IAttendanceAuditLog>(
  'AttendanceAuditLog',
  attendanceAuditLogSchema
);
