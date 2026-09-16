import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

departmentSchema.index({ name: 1 }, { unique: true });

export const Department = mongoose.model<IDepartment>('Department', departmentSchema);
