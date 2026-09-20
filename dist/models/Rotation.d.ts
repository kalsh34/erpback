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
export type RotationShiftMode = 'STANDARD_12H' | 'SINGLE_24H';
export interface IRotation extends Document {
    name: string;
    description?: string;
    siteId: mongoose.Types.ObjectId;
    guardPool: IRotationGuard[];
    floaterPool: IRotationFloater[];
    shiftMode: RotationShiftMode;
    dayShiftCount: number;
    nightShiftCount: number;
    dayStartTime: string;
    dayEndTime?: string;
    nightStartTime?: string;
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