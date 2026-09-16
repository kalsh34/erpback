import mongoose, { Document } from 'mongoose';
export interface IPayrollFormulaVersion extends Document {
    version: number;
    isCurrent: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date;
    grossComponentCodes: string[];
    taxableComponentCodes: string[];
    pensionBaseComponentCodes: string[];
    deductionComponentCodes: string[];
    createdById: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PayrollFormulaVersion: mongoose.Model<IPayrollFormulaVersion, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollFormulaVersion, {}, {}> & IPayrollFormulaVersion & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayrollFormulaVersion.d.ts.map