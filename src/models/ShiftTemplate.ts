import mongoose, { Schema, Document } from 'mongoose';

export interface IShiftTemplate extends Document {
  name: string;
  description?: string;
  siteId?: mongoose.Types.ObjectId;
  shiftType: 'DAY' | 'NIGHT' | 'MIXED';
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "18:00"
  maxGuards: number;
  minGuards: number;
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc. (empty means daily)
  overtimeRate?: number;
  active: boolean;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const shiftTemplateSchema = new Schema<IShiftTemplate>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', default: null },
    shiftType: { type: String, enum: ['DAY', 'NIGHT', 'MIXED'], required: true, default: 'DAY' },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxGuards: { type: Number, required: true, min: 1, default: 1 },
    minGuards: { type: Number, required: true, min: 1, default: 1 },
    daysOfWeek: { type: [Number] },
    overtimeRate: { type: Number, default: 1.5 },
    active: { type: Boolean, default: true },
    color: { type: String, default: '#3B82F6' },
  },
  { timestamps: true }
);

shiftTemplateSchema.index({ name: 1 });
shiftTemplateSchema.index({ siteId: 1 });

export const ShiftTemplate = mongoose.model<IShiftTemplate>('ShiftTemplate', shiftTemplateSchema);
