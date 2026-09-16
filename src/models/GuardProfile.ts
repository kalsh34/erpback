import mongoose, { Schema, Document } from 'mongoose';
import { GuardPosition } from '../types';

export interface IGuardProfile extends Document {
  employeeId: mongoose.Types.ObjectId;
  position: GuardPosition;
  idCardNumber?: string;
  employmentType: string;
  rate?: number;
  transportAllowance?: number;
  createdAt: Date;
  updatedAt: Date;
}

const guardProfileSchema = new Schema<IGuardProfile>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    position: { type: String, enum: Object.values(GuardPosition), default: GuardPosition.GUARD },
    idCardNumber: { type: String, trim: true },
    employmentType: { type: String, required: true },
    rate: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const GuardProfile = mongoose.model<IGuardProfile>('GuardProfile', guardProfileSchema);
