import mongoose, { Schema, Document } from 'mongoose';

/**
 * One generated duty for a guard on a site, produced by the shift-scheduling
 * algorithm (or the scheduler UI). Unlike the legacy RotationAssignment, every
 * assignment stores ABSOLUTE start/end timestamps (startAt/endAt) in addition
 * to the shift labels, so overlap and rest checks across sites are exact and
 * cheap — a guard's whole timeline can be reconstructed with one indexed query.
 */

export type ScheduleShiftType = 'DAY' | 'NIGHT' | 'FULL';

export interface IScheduleAssignment extends Document {
  planId: mongoose.Types.ObjectId;
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  /** Calendar day the shift belongs to (00:00 local). */
  date: Date;
  shiftType: ScheduleShiftType;
  /** Label times as entered on the plan, e.g. '06:00' / '18:00'. */
  startTime: string;
  endTime: string;
  /** Absolute window — night shifts and 24h duties cross midnight. */
  startAt: Date;
  endAt: Date;
  /** True when the rest rule had to be relaxed (pool too small) for this duty. */
  isOverride: boolean;
  assignedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleAssignmentSchema = new Schema<IScheduleAssignment>(
  {
    planId: { type: Schema.Types.ObjectId, ref: 'ShiftSchedule', required: true },
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: Date, required: true },
    shiftType: { type: String, enum: ['DAY', 'NIGHT', 'FULL'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    isOverride: { type: Boolean, default: false },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

scheduleAssignmentSchema.index({ planId: 1, date: 1 });
scheduleAssignmentSchema.index({ guardId: 1, startAt: 1 });
scheduleAssignmentSchema.index({ siteId: 1, date: 1 });
scheduleAssignmentSchema.index({ guardId: 1, date: 1 });

export const ScheduleAssignment = mongoose.model<IScheduleAssignment>('ScheduleAssignment', scheduleAssignmentSchema);
