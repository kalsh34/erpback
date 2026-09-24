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

export interface IShiftDefinition {
  key: string;            // 'DAY' | 'NIGHT' | 'MORNING' | ... unique within the rotation
  name: string;           // display name, e.g. 'Day Shift'
  startTime: string;      // 'HH:MM'
  endTime: string;        // 'HH:MM' (may be <= startTime => crosses midnight; equal => 24h)
  requiredCount: number;  // guards required per day for this shift (>= 0)
}

export interface IRestRule {
  maxShiftHours: number;  // applies to shifts of <= this duration
  minRestHours: number;   // minimum recovery time after such a shift
}

export interface IChangeLogEntry {
  at: Date;
  by?: mongoose.Types.ObjectId;
  action: string;
  details?: string;
}

export type RotationStatus =
  | 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEW' | 'APPROVED'
  | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';

export interface IRotation extends Document {
  name: string;
  description?: string;
  siteId: mongoose.Types.ObjectId;
  guardPool: IRotationGuard[];
  floaterPool: IRotationFloater[];
  shiftMode: 'STANDARD_12H' | 'SINGLE_24H' | 'CUSTOM';
  shiftDefinitions: IShiftDefinition[];
  dayShiftCount: number;
  nightShiftCount: number;
  dayStartTime: string;
  dayEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
  restRules: IRestRule[];
  startDate: Date;
  endDate?: Date;
  status: RotationStatus;
  lastGeneratedDate?: Date;
  generation?: {
    generatedAt?: Date;
    generatedBy?: mongoose.Types.ObjectId;
    days?: number;
    algorithmVersion?: string;
    rulesFingerprint?: string;
    conflictCount?: number;
    feasibility?: 'FULLY_COMPLIANT' | 'BEST_POSSIBLE';
    stale?: boolean;
    stats?: any;
    conflicts?: any[];
  };
  changeLog: IChangeLogEntry[];
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

const shiftDefinitionSchema = new Schema<IShiftDefinition>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    requiredCount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const restRuleSchema = new Schema<IRestRule>(
  {
    maxShiftHours: { type: Number, required: true, min: 1 },
    minRestHours: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const changeLogSchema = new Schema<IChangeLogEntry>(
  {
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const ROTATION_STATUSES: RotationStatus[] = [
  'DRAFT', 'GENERATING', 'GENERATED', 'REVIEW', 'APPROVED',
  'PUBLISHED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED',
];

const rotationSchema = new Schema<IRotation>(
  {
    name: { type: String, required: true },
    description: { type: String },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [rotationGuardSchema],
    floaterPool: [rotationFloaterSchema],
    shiftMode: { type: String, enum: ['STANDARD_12H', 'SINGLE_24H', 'CUSTOM'], default: 'STANDARD_12H' },
    shiftDefinitions: { type: [shiftDefinitionSchema], default: [] },
    // Legacy fields kept for backward compatibility. Counts may be 0 (e.g. 24-hour
    // single-shift mode has nightShiftCount = 0). New rotations persist explicit
    // shiftDefinitions; resolveShifts() synthesizes definitions for old documents.
    dayShiftCount: { type: Number, required: true, min: 0, default: 1 },
    nightShiftCount: { type: Number, min: 0, default: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    dayEndTime: { type: String, default: '18:00' },
    nightStartTime: { type: String, default: '18:00' },
    // NOTE: legacy documents stored the night START under this name ('18:00').
    // New documents store the real night end ('06:00'). resolveShifts() detects
    // legacy documents by the absence of nightStartTime and handles both.
    nightEndTime: { type: String, default: '06:00' },
    restRules: {
      type: [restRuleSchema],
      default: () => [
        { maxShiftHours: 12, minRestHours: 24 },
        { maxShiftHours: 24, minRestHours: 48 },
      ],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ROTATION_STATUSES, default: 'DRAFT' },
    lastGeneratedDate: { type: Date },
    generation: {
      type: new Schema<any>(
        {
          generatedAt: Date,
          generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
          days: Number,
          algorithmVersion: String,
          rulesFingerprint: String,
          conflictCount: Number,
          feasibility: { type: String, enum: ['FULLY_COMPLIANT', 'BEST_POSSIBLE'] },
          stale: { type: Boolean, default: false },
          stats: Schema.Types.Mixed,
          conflicts: Schema.Types.Mixed,
        },
        { _id: false }
      ),
      default: undefined,
    },
    changeLog: { type: [changeLogSchema], default: [] },
    leaveCoverages: [leaveCoverageSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

rotationSchema.index({ name: 1 });
rotationSchema.index({ status: 1 });
rotationSchema.index({ siteId: 1 });

export const Rotation = mongoose.model<IRotation>('Rotation', rotationSchema);
