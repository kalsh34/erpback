import mongoose, { Document } from 'mongoose';
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
export declare const GuardProfile: mongoose.Model<IGuardProfile, {}, {}, {}, mongoose.Document<unknown, {}, IGuardProfile, {}, {}> & IGuardProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardProfile.d.ts.map