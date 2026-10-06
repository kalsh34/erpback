import mongoose, { Schema, Document } from 'mongoose';

export interface IPayGrade extends Document {
  name: string;
  description?: string;
  /** Salary range lower bound (kept as basicSalary for backwards compatibility). */
  basicSalary: number;
  /** Salary range upper bound (optional — grades may remain a single amount). */
  salaryMax?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pay grades are the third HR-owned lookup next to Departments and Positions
 * (e.g. "G1 - Junior", "G4 - Senior Officer"). Contracts pick their grade from
 * this list, so the finance side never types a grade by hand.
 */
const payGradeSchema = new Schema<IPayGrade>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    basicSalary: { type: Number, default: 0, min: 0 },
    salaryMax: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PayGrade = mongoose.model<IPayGrade>('PayGrade', payGradeSchema);
