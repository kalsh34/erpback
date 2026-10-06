import mongoose, { Document } from 'mongoose';
export interface IPayGrade extends Document {
    name: string;
    description?: string;
    basicSalary: number;
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