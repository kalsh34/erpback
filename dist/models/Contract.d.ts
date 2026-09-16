import mongoose, { Document } from 'mongoose';
export interface IContract extends Document {
    employeeId: mongoose.Types.ObjectId;
    salaryStructureId?: mongoose.Types.ObjectId;
    contractStartDate: Date;
    contractEndDate?: Date;
    department?: string;
    grade?: string;
    jobPosition?: string;
    contractType: string;
    wage: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableAllowance: number;
    transportAllowance: number;
    pensionEnrolled: boolean;
    notes?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contract: mongoose.Model<IContract, {}, {}, {}, mongoose.Document<unknown, {}, IContract, {}, {}> & IContract & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Contract.d.ts.map