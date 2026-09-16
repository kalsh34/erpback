import mongoose, { Schema, Document } from 'mongoose';

export interface IRotationAssignment extends Document {
  rotationId: mongoose.Types.ObjectId;
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  date: Date;
  shiftType: 'DAY' | 'NIGHT';
  shiftTime: string;
  assignedBy?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const rotationAssignmentSchema = new Schema<IRotationAssignment>(
  {
    rotationId: { type: Schema.Types.ObjectId, ref: 'Rotation', required: true },
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: Date, required: true },
    shiftType: { type: String, enum: ['DAY', 'NIGHT'], required: true },
    shiftTime: { type: String, required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

rotationAssignmentSchema.index({ rotationId: 1, date: 1 });
rotationAssignmentSchema.index({ guardId: 1, date: 1 });
rotationAssignmentSchema.index({ siteId: 1, date: 1 });

export const RotationAssignment = mongoose.model<IRotationAssignment>('RotationAssignment', rotationAssignmentSchema);
