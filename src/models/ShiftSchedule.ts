import mongoose, { Schema, Document } from 'mongoose';

/**
 * Shift Scheduling (redesigned replacement for the legacy "Rotation" model).
 *
 * A ShiftSchedule is a scheduling PLAN for one site: which guards are in the
 * pool, what the shift pattern looks like (12h day+night or single 24h duty)
 * and the date window the plan covers. The actual generated duties live in
 * the ScheduleAssignment collection, produced by the fair-rest algorithm in
 * shiftSchedule.service.ts.
 */

export type ShiftMode = 'STANDARD_12H' | 'SINGLE_24H';

export interface ISchedulePoolGuard {
  guardId: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  order: number;
}

export interface IShiftSchedule extends Document {
  name: string;
  description?: string;
  siteId: mongoose.Types.ObjectId;
  guardPool: ISchedulePoolGuard[];
  /** Shared floaters: only used when the site pool cannot cover a slot at all. */
  floaterPool: ISchedulePoolGuard[];
  shiftMode: ShiftMode;
  /** Guards required on the day shift (12h mode) or on the 24h duty (24h mode). */
  dayCount: number;
  /** Guards required on the night shift (12h mode only). */
  nightCount: number;
  dayStartTime: string;
  dayEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
  startDate: Date;
  endDate: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  lastGeneratedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poolGuardSchema = new Schema<ISchedulePoolGuard>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const shiftScheduleSchema = new Schema<IShiftSchedule>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [poolGuardSchema],
    floaterPool: [poolGuardSchema],
    shiftMode: { type: String, enum: ['STANDARD_12H', 'SINGLE_24H'], default: 'STANDARD_12H' },
    dayCount: { type: Number, required: true, min: 0, default: 1 },
    nightCount: { type: Number, required: true, min: 0, default: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    dayEndTime: { type: String, required: true, default: '18:00' },
    nightStartTime: { type: String, required: true, default: '18:00' },
    nightEndTime: { type: String, required: true, default: '06:00' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    lastGeneratedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

shiftScheduleSchema.index({ siteId: 1 });
shiftScheduleSchema.index({ status: 1 });
shiftScheduleSchema.index({ 'guardPool.guardId': 1 });

export const ShiftSchedule = mongoose.model<IShiftSchedule>('ShiftSchedule', shiftScheduleSchema);
