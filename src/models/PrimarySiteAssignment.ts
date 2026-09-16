import mongoose, { Schema, Document } from 'mongoose';

export interface IPrimarySiteAssignment extends Document {
  guardId: mongoose.Types.ObjectId;
  siteId: mongoose.Types.ObjectId;
  role: 'GUARD' | 'SUPERVISOR';
  standardMonthlyHours: number;
  hourlyRate: number;
  transportAllowance: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const primarySiteAssignmentSchema = new Schema<IPrimarySiteAssignment>(
  {
    guardId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: Schema.Types.ObjectId, ref: 'Site', required: true },
    role: { type: String, enum: ['GUARD', 'SUPERVISOR'], default: 'GUARD' },
    standardMonthlyHours: { type: Number, required: true },
    hourlyRate: { type: Number, required: true },
    transportAllowance: { type: Number, default: 0 },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

primarySiteAssignmentSchema.index({ guardId: 1, isCurrent: 1 });
primarySiteAssignmentSchema.index({ siteId: 1 });

export const PrimarySiteAssignment = mongoose.model<IPrimarySiteAssignment>(
  'PrimarySiteAssignment',
  primarySiteAssignmentSchema
);
