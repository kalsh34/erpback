import mongoose, { Schema, Document } from 'mongoose';

export interface IPerformance extends Document {
  employeeId: mongoose.Types.ObjectId;
  period: string;
  attendanceRate: number;
  punctualityRate: number;
  score: number;
  trend: number;
  flags: string[];
  reviewDueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const performanceSchema = new Schema<IPerformance>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    period: { type: String, required: true, trim: true },
    attendanceRate: { type: Number, required: true, min: 0, max: 100 },
    punctualityRate: { type: Number, required: true, min: 0, max: 100 },
    score: { type: Number, required: true, min: 0, max: 100 },
    trend: { type: Number, default: 0 },
    flags: [{ type: String, trim: true }],
    reviewDueDate: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

performanceSchema.index({ employeeId: 1, period: 1 }, { unique: true });
performanceSchema.index({ period: 1 });
performanceSchema.index({ score: -1 });

export const Performance = mongoose.model<IPerformance>('Performance', performanceSchema);
