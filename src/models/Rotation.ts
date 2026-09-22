import mongoose, { Schema, Document } from 'mongoose';

export interface IRotationGuard {
  guardId: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  order: number;
}

export interface IRotationFloater {
  guardId: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ILeaveCoverage {
  guardId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  coverGuardId: mongoose.Types.ObjectId;
  path: 'POOL' | 'FLOATER';
  appliedBy: mongoose.Types.ObjectId;
  appliedAt: Date;
}

export interface IRotation extends Document {
  name: string;
  description?: string;
  siteId: mongoose.Types.ObjectId;
  guardPool: IRotationGuard[];
  floaterPool: IRotationFloater[];
  dayShiftCount: number;
  nightShiftCount: number;
  dayStartTime: string;
  nightEndTime: string;
  startDate: Date;
  endDate?: Date;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  lastGeneratedDate?: Date;
  leaveCoverages: ILeaveCoverage[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const rotationGuardSchema = new Schema<IRotationGuard>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const rotationFloaterSchema = new Schema<IRotationFloater>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { _id: false }
);

const leaveCoverageSchema = new Schema<ILeaveCoverage>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    coverGuardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    path: { type: String, enum: ['POOL', 'FLOATER'], required: true },
    appliedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const rotationSchema = new Schema<IRotation>(
  {
    name: { type: String, required: true },
    description: { type: String },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [rotationGuardSchema],
    floaterPool: [rotationFloaterSchema],
    dayShiftCount: { type: Number, required: true, min: 1 },
    nightShiftCount: { type: Number, required: true, min: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    nightEndTime: { type: String, required: true, default: '18:00' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'DRAFT' },
    lastGeneratedDate: { type: Date },
    leaveCoverages: [leaveCoverageSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

rotationSchema.index({ name: 1 });
rotationSchema.index({ status: 1 });
rotationSchema.index({ siteId: 1 });

export const Rotation = mongoose.model<IRotation>('Rotation', rotationSchema);
