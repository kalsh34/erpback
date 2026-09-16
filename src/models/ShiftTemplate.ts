import mongoose, { Schema, Document } from 'mongoose';
import { GuardPosition, EmploymentType } from '../types';

export interface IShiftTemplate extends Document {
  name: string;
  description?: string;
  shiftType: 'DAY' | 'NIGHT' | 'MIXED';
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "18:00"
  maxGuards: number;
  minGuards: number;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc. (empty means daily)
  overtimeRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

const shiftTemplateSchema = new Schema<IShiftTemplate>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    shiftType: { type: String, enum: ['DAY', 'NIGHT', 'MIXED'], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxGuards: { type: Number, required: true, min: 1 },
    minGuards: { type: Number, required: true, min: 1 },
    daysOfWeek: { type: [Number] },
    overtimeRate: { type: Number, default: 1.5 },
  },
  { timestamps: true }
);

shiftTemplateSchema.index({ name: 1 });

export const ShiftTemplate = mongoose.model<IShiftTemplate>('ShiftTemplate', shiftTemplateSchema);