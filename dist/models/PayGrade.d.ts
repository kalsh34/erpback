import mongoose, { Document } from 'mongoose';
export interface IPayGrade extends Document {
    name: string;
    description?: string;
    /** Salary range lower bound (kept as basicSalary for backwards compatibility). */
    basicSalary: number;
    /** Salary range upper bound (optional — grades may remain a single amount). */
    salaryMax?: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PayGrade: mongoose.Model<IPayGrade, {}, {}, {}, mongoose.Document<unknown, {}, IPayGrade, {}, {}> & IPayGrade & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayGrade.d.ts.map