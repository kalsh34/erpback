import mongoose, { Schema, Document } from 'mongoose';
import { ShiftAssignmentSource } from '../types';

export interface IShiftAssignment extends Document {
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  shiftTemplateId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  status: 'ACTIVE' | 'INACTIVE';
  source: ShiftAssignmentSource;
  rotationId?: mongoose.Types.ObjectId;
  assignedById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const shiftAssignmentSchema = new Schema<IShiftAssignment>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    shiftTemplateId: { type: Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    source: { type: String, enum: Object.values(ShiftAssignmentSource), default: ShiftAssignmentSource.MANUAL },
    rotationId: { type: Schema.Types.ObjectId, ref: 'Rotation', default: null },
    assignedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

shiftAssignmentSchema.index({ guardId: 1, status: 1 });
shiftAssignmentSchema.index({ siteId: 1, status: 1 });
shiftAssignmentSchema.index({ startDate: 1, endDate: 1 });
shiftAssignmentSchema.index({ source: 1 });
shiftAssignmentSchema.index({ rotationId: 1 }, { sparse: true });

export const ShiftAssignment = mongoose.model<IShiftAssignment>('ShiftAssignment', shiftAssignmentSchema);
