import mongoose, { Document } from 'mongoose';
import { PayrollPeriodStatus } from '../types';
export interface IPayrollPeriod extends Document {
    year: number;
    month: number;
    monthName: string;
    startDate: Date;
    endDate: Date;
    status: PayrollPeriodStatus;
    lockedAt?: Date;
    lockedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PayrollPeriod: mongoose.Model<IPayrollPeriod, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollPeriod, {}, {}> & IPayrollPeriod & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayrollPeriod.d.ts.map