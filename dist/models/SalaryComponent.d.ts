import mongoose, { Document } from 'mongoose';
export interface ISalaryComponent extends Document {
    code: string;
    label: string;
    sourceType: 'CONTRACT' | 'HR_MONTHLY_INPUT';
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SalaryComponent: mongoose.Model<ISalaryComponent, {}, {}, {}, mongoose.Document<unknown, {}, ISalaryComponent, {}, {}> & ISalaryComponent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SalaryComponent.d.ts.map