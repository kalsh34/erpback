import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: mongoose.Types.ObjectId;
  /** Self-service contact info editable by the user on the profile page. */
  phone?: string;
  /** Profile picture URL (path under /uploads). */
  avatarUrl?: string;
  /** Module access overrides set by an admin at user-creation/edit time.
   *  Effective permissions = role defaults + granted modules − denied modules. */
  moduleGrants: string[];
  moduleDenies: string[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: Object.values(UserRole), required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    phone: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    moduleGrants: { type: [String], default: [] },
    moduleDenies: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
