import mongoose, { Schema, Document } from 'mongoose';

/**
 * GUARD PAYROLL CONFIG — singleton (key = 'default') holding the
 * configurable constants of the guard payroll engine.
 *
 * Defaults implement the agreed rules:
 *   • transportPercent 20 (configurable, NOT taxable, primary site only)
 *   • standardMonthlyHours 240  → OT Rate = Compensation / 240
 *   • sundayStructuralHours 32  → Sunday Structural = OT Rate × 32
 *   • basicHourlyDivisor 208    → Basic Hourly Rate = Basic / 208 (NOT 240)
 */
export interface IGuardPayrollConfig extends Document {
  key: string;
  transportPercent: number;
  standardMonthlyHours: number;
  sundayStructuralHours: number;
  basicHourlyDivisor: number;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const guardPayrollConfigSchema = new Schema<IGuardPayrollConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    transportPercent: { type: Number, default: 20, min: 0, max: 100 },
    standardMonthlyHours: { type: Number, default: 240, min: 1 },
    sundayStructuralHours: { type: Number, default: 32, min: 0 },
    basicHourlyDivisor: { type: Number, default: 208, min: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const GuardPayrollConfig = mongoose.model<IGuardPayrollConfig>(
  'GuardPayrollConfig',
  guardPayrollConfigSchema
);
