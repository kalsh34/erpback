import mongoose, { Schema, Document } from 'mongoose';
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
  date: string; // YYYY-MM-DD (local calendar date)
  dayOfMonth: number;
  hoursWorked: number;
  isHoliday: boolean;
  periodKey: string; // "YYYY-MM" calendar month of the work date
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

const guardAttendanceSchema = new Schema<IGuardAttendanceRecord>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayOfMonth: { type: Number, required: true },
    hoursWorked: { type: Number, required: true, min: 0.01 },
    isHoliday: { type: Boolean, default: false },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    status: { type: String, enum: Object.values(GuardAttendanceStatus), default: GuardAttendanceStatus.ACTIVE },
    source: { type: String, enum: Object.values(AttendanceSource), default: AttendanceSource.OPERATIONS_EDIT },
    notes: { type: String, trim: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [{
      previousHours: { type: Number, default: null },
      newHours: { type: Number, required: true },
      reason: { type: String, trim: true },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      changedAt: { type: Date, default: Date.now },
    }],
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
    voidReason: { type: String, trim: true },
  },
  { timestamps: true }
);

// Hard rule: one ACTIVE row per guard + site + date. VOID rows stay for audit.
guardAttendanceSchema.index(
  { guardId: 1, siteId: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: GuardAttendanceStatus.ACTIVE } }
);
guardAttendanceSchema.index({ periodKey: 1, guardId: 1 });
guardAttendanceSchema.index({ siteId: 1, date: 1 });
guardAttendanceSchema.index({ guardId: 1, date: 1 });

export const GuardAttendanceRecord = mongoose.model<IGuardAttendanceRecord>(
  'GuardAttendanceRecord',
  guardAttendanceSchema
);
