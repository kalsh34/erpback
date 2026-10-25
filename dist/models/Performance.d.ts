import mongoose, { Document } from 'mongoose';
export interface IPerformance extends Document {
    employeeId: mongoose.Types.ObjectId;
    period: string;
    attendanceRate: number;
    punctualityRate: number;
    score: number;
    trend: number;
    flags: string[];
    reviewDueDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Performance: mongoose.Model<IPerformance, {}, {}, {}, mongoose.Document<unknown, {}, IPerformance, {}, {}> & IPerformance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Performance.d.ts.map