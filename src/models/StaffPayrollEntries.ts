import mongoose, { Schema, Document } from 'mongoose';
import { DeductionStatus } from '../types';

/**
 * STAFF OVERTIME ENTRY — overtime pay entered per staff employee for one
 * payroll month. The amount (ETB) is what enters Gross and Taxable earnings;
 * `hours` is an optional reference field only. Amount entries are upserted per
 * employee+period, so re-entering for the same month replaces the value.
 */
export interface IStaffOvertimeEntry extends Document {
  employeeId: mongoose.Types.ObjectId;
  periodKey: string; // "YYYY-MM"
  amount: number;
  hours?: number | null;
  notes?: string;
  status: DeductionStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** STAFF BONUS — paid OUTSIDE the payroll formula: never taxed, never
 *  pensionable, never in gross or deductions. Snapshotted into the record and
 *  added after Net Pay (Final Amount Paid = Net Pay + Bonus). */
export interface IStaffBonus extends Document {
  employeeId: mongoose.Types.ObjectId;
  periodKey: string; // "YYYY-MM"
  amount: number;
  label: string;
  status: DeductionStatus;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const entryBase = {
  employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  status: { type: String, enum: Object.values(DeductionStatus), default: DeductionStatus.ACTIVE },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
};

const staffOvertimeEntrySchema = new Schema<IStaffOvertimeEntry>(
  {
    ...entryBase,
    amount: { type: Number, required: true, min: 0 },
    hours: { type: Number, default: null, min: 0 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);
staffOvertimeEntrySchema.index({ employeeId: 1, periodKey: 1, status: 1 });

const staffBonusSchema = new Schema<IStaffBonus>(
  {
    ...entryBase,
    amount: { type: Number, required: true, min: 0 },
    label: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);
staffBonusSchema.index({ employeeId: 1, periodKey: 1, status: 1 });

export const StaffOvertimeEntry = mongoose.model<IStaffOvertimeEntry>('StaffOvertimeEntry', staffOvertimeEntrySchema);
export const StaffBonus = mongoose.model<IStaffBonus>('StaffBonus', staffBonusSchema);
