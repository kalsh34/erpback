import mongoose, { Document } from 'mongoose';
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
export declare const Rotation: mongoose.Model<IRotation, {}, {}, {}, mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Rotation.d.ts.map