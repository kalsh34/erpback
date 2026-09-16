import mongoose, { Document } from 'mongoose';
export interface ISalaryStructureEarning {
    componentCode: string;
    label: string;
    calculationType: 'HOURLY_RATE' | 'FIXED_AMOUNT' | 'PERCENTAGE';
    defaultRate: number;
    taxable: boolean;
    required: boolean;
}
export interface ISalaryStructureDeduction {
    componentCode: string;
    label: string;
    calculationType: string;
    defaultValue: number;
    enabled: boolean;
}
export interface ISalaryStructure extends Document {
    name: string;
    employeeType: 'GUARD' | 'STAFF';
    payBasis: 'HOURLY' | 'MONTHLY';
    version: number;
    isCurrent: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date;
    otMultiplier: number;
    holidayMultiplier: number;
    holidayOtMultiplier: number;
    earnings: ISalaryStructureEarning[];
    deductions: ISalaryStructureDeduction[];
    createdById: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SalaryStructure: mongoose.Model<ISalaryStructure, {}, {}, {}, mongoose.Document<unknown, {}, ISalaryStructure, {}, {}> & ISalaryStructure & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SalaryStructure.d.ts.map