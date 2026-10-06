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
export interface IShiftDefinition {
    key: string;
    name: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
}
export interface IRestRule {
    maxShiftHours: number;
    minRestHours: number;
}
export interface IChangeLogEntry {
    at: Date;
    by?: mongoose.Types.ObjectId;
    action: string;
    details?: string;
}
export type RotationStatus = 'DRAFT' | 'GENERATING' | 'GENERATED' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
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
export declare const Rotation: mongoose.Model<IRotation, {}, {}, {}, mongoose.Document<unknown, {}, IRotation, {}, {}> & IRotation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Rotation.d.ts.map