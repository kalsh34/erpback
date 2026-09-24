import mongoose, { Schema, Document } from 'mongoose';

export interface IRotationAssignment extends Document {
  rotationId: mongoose.Types.ObjectId;
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  date: Date;             // duty START date (local midnight)
  shiftType: string;      // shift KEY: 'DAY' | 'NIGHT' | custom keys
  shiftName?: string;     // display name, e.g. 'Day Shift'
  shiftTime: string;      // shift start time label 'HH:MM' (legacy field, kept)
  startAt?: Date;         // exact duty start timestamp
  endAt?: Date;           // exact duty end timestamp (may cross midnight)
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
    // Not an enum: custom shift definitions use their own keys. Legacy data and
    // standard rotations keep using 'DAY' / 'NIGHT'.
    shiftType: { type: String, required: true },
    shiftName: { type: String },
    shiftTime: { type: String, required: true },
    startAt: { type: Date },
    endAt: { type: Date },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

rotationAssignmentSchema.index({ rotationId: 1, date: 1 });
rotationAssignmentSchema.index({ guardId: 1, date: 1 });
rotationAssignmentSchema.index({ siteId: 1, date: 1 });

export const RotationAssignment = mongoose.model<IRotationAssignment>('RotationAssignment', rotationAssignmentSchema);
