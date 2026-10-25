import mongoose, { Document } from 'mongoose';
import { ShiftAssignmentSource } from '../types';
export interface IShiftAssignment extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    shiftTemplateId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate?: Date;
    status: 'ACTIVE' | 'INACTIVE';
    source: ShiftAssignmentSource;
    rotationId?: mongoose.Types.ObjectId;
    assignedById: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftAssignment: mongoose.Model<IShiftAssignment, {}, {}, {}, mongoose.Document<unknown, {}, IShiftAssignment, {}, {}> & IShiftAssignment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ShiftAssignment.d.ts.map