import mongoose, { Document } from 'mongoose';
export interface IRotationAssignment extends Document {
    rotationId: mongoose.Types.ObjectId;
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    date: Date;
    shiftType: 'DAY' | 'NIGHT';
    shiftTime: string;
    assignedBy?: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RotationAssignment: mongoose.Model<IRotationAssignment, {}, {}, {}, mongoose.Document<unknown, {}, IRotationAssignment, {}, {}> & IRotationAssignment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=RotationAssignment.d.ts.map