import mongoose, { Document } from 'mongoose';
export interface IShiftTemplate extends Document {
    name: string;
    description?: string;
    shiftType: 'DAY' | 'NIGHT' | 'MIXED';
    startTime: string;
    endTime: string;
    maxGuards: number;
    minGuards: number;
    daysOfWeek: number[];
    overtimeRate?: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ShiftTemplate: mongoose.Model<IShiftTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IShiftTemplate, {}, {}> & IShiftTemplate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ShiftTemplate.d.ts.map