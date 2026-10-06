import mongoose, { Schema, Document } from 'mongoose';

/**
 * MONTHLY TOTAL HOURS — the second way to record guard attendance.
 *
 * The site officer enters ONE total per guard + site + month and classifies
 * it into three buckets:
 *   • normalHours  — regular working hours (paid at base rate)
 *   • holidayHours — public-holiday hours   (multiplied by OT rate in payroll)
 *   • sundayHours  — Sunday hours           (multiplied by OT rate in payroll)
 *
 * This is the monthly counterpart of GuardAttendanceRecord (daily hours).
 * Payroll consumes whichever input the site officer used for the month:
 * if monthly totals exist for a guard they take precedence over daily sums.
 */
export interface IGuardMonthlyHours extends Document {
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  periodKey: string; // "YYYY-MM" calendar month
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
  notes?: string;
  source: string; // AttendanceSource
  recordedBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  changeHistory: {
    previous: { normalHours: number; holidayHours: number; sundayHours: number };
    new: { normalHours: number; holidayHours: number; sundayHours: number };
    reason?: string;
    changedBy: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const guardMonthlyHoursSchema = new Schema<IGuardMonthlyHours>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    normalHours: {
      type: Number,
      default: 0,
      min: [0, 'Hours cannot be negative'],
      validate: {
        validator: (v: number) => Math.round(v * 100) / 100 === v,
        message: 'Hours support at most 2 decimal places',
      },
    },
    holidayHours: {
      type: Number,
      default: 0,
      min: [0, 'Hours cannot be negative'],
      validate: {
        validator: (v: number) => Math.round(v * 100) / 100 === v,
        message: 'Hours support at most 2 decimal places',
      },
    },
    sundayHours: {
      type: Number,
      default: 0,
      min: [0, 'Hours cannot be negative'],
      validate: {
        validator: (v: number) => Math.round(v * 100) / 100 === v,
        message: 'Hours support at most 2 decimal places',
      },
    },
    notes: { type: String, trim: true },
    source: { type: String, default: 'HR_MANUAL' },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [{
      previous: {
        normalHours: { type: Number, default: 0 },
        holidayHours: { type: Number, default: 0 },
        sundayHours: { type: Number, default: 0 },
      },
      new: {
        normalHours: { type: Number, required: true },
        holidayHours: { type: Number, required: true },
        sundayHours: { type: Number, required: true },
      },
      reason: { type: String, trim: true },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      changedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

// One monthly sheet per guard + site + month.
guardMonthlyHoursSchema.index(
  { guardId: 1, siteId: 1, periodKey: 1 },
  { unique: true }
);
guardMonthlyHoursSchema.index({ periodKey: 1, siteId: 1 });

export const GuardMonthlyHours = mongoose.model<IGuardMonthlyHours>(
  'GuardMonthlyHours',
  guardMonthlyHoursSchema
);
