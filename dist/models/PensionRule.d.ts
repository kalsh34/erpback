import mongoose, { Document } from 'mongoose';
export interface IPensionRule extends Document {
    label: string;
    employeeRate: number;
    employerRate: number;
    pensionTaxBase: 'NORMAL_SALARY_ONLY' | 'GROSS_PAY';
    effectiveFrom: Date;
    effectiveTo?: Date;
    isCurrent: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PensionRule: mongoose.Model<IPensionRule, {}, {}, {}, mongoose.Document<unknown, {}, IPensionRule, {}, {}> & IPensionRule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PensionRule.d.ts.map