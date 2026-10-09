import mongoose, { Document } from 'mongoose';
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
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map