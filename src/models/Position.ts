import mongoose, { Schema, Document } from 'mongoose';

export interface IPosition extends Document {
  name: string;
  departmentId?: mongoose.Types.ObjectId;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const positionSchema = new Schema<IPosition>(
  {
    name: { type: String, required: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

positionSchema.index({ name: 1, departmentId: 1 }, { unique: true });

export const Position = mongoose.model<IPosition>('Position', positionSchema);
