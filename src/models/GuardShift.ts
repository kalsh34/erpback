import mongoose, { Schema, Document } from 'mongoose';

/**
 * A real guard shift captured from the guard portal: CLOCK IN opens the
 * shift, CLOCK OUT closes it and pushes the computed hours into the daily
 * GuardAttendanceRecord (source SELF_CLOCK) that payroll already consumes.
 *
 * One guard has at most ONE open shift at a time (unique partial index).
 */
export type GuardShiftStatus = 'OPEN' | 'CLOSED';

export interface IGuardShift extends Document {
  guardUserId: mongoose.Types.ObjectId; // User (login account)
  employeeId: mongoose.Types.ObjectId; // Employee (HR record — attendance is recorded against this)
  siteId: mongoose.Types.ObjectId; // Site scanned from the QR code
  /** Local calendar date (YYYY-MM-DD) of the CLOCK IN. */
  date: string;
  clockInAt: Date;
  clockOutAt?: Date;
  /** Hours worked, 2 decimals, computed at clock-out. */
  computedHours?: number;
  status: GuardShiftStatus;
  /** Daily attendance row created by the clock-out. */
  attendanceRecordId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guardShiftSchema = new Schema<IGuardShift>(
  {
    guardUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    clockInAt: { type: Date, required: true },
    clockOutAt: { type: Date },
    computedHours: { type: Number, min: 0 },
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    attendanceRecordId: { type: Schema.Types.ObjectId, ref: 'GuardAttendanceRecord' },
  },
  { timestamps: true }
);

// Hard rule: a guard can only be on ONE shift at a time.
guardShiftSchema.index(
  { guardUserId: 1 },
  { unique: true, partialFilterExpression: { status: 'OPEN' } }
);
guardShiftSchema.index({ employeeId: 1, date: 1 });
guardShiftSchema.index({ siteId: 1, date: 1 });

export const GuardShift = mongoose.model<IGuardShift>('GuardShift', guardShiftSchema);
