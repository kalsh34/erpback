import mongoose, { Document } from 'mongoose';
export interface ISecondaryShiftEntry extends Document {
    guardId: mongoose.Types.ObjectId;
    payrollPeriodId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    date: Date;
    hours: number;
    rate: number;
    totalPay: number;
    notes?: string;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SecondaryShiftEntry: mongoose.Model<ISecondaryShiftEntry, {}, {}, {}, mongoose.Document<unknown, {}, ISecondaryShiftEntry, {}, {}> & ISecondaryShiftEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SecondaryShiftEntry.d.ts.map