import mongoose, { Document } from 'mongoose';
export interface IPayrollRate extends Document {
    payrollPeriodId: mongoose.Types.ObjectId;
    normalRate: number;
    otRate: number;
    holidayRate: number;
    setBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PayrollRate: mongoose.Model<IPayrollRate, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollRate, {}, {}> & IPayrollRate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayrollRate.d.ts.map