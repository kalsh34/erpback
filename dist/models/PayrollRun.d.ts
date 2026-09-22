import mongoose, { Document } from 'mongoose';
export declare enum PayrollRunStatus {
    DRAFT = "DRAFT",
    APPROVED = "APPROVED",
    PAID = "PAID"
}
export declare enum PayrollRunType {
    GUARD = "GUARD",
    STAFF = "STAFF",
    ALL = "ALL"
}
export interface IPayrollRun extends Document {
    name: string;
    runType: PayrollRunType;
    periodFrom: mongoose.Types.ObjectId;
    periodTo?: mongoose.Types.ObjectId;
    periodIds: mongoose.Types.ObjectId[];
    periodLabel: string;
    status: PayrollRunStatus;
    totalGross: number;
    totalNet: number;
    employeeCount: number;
    createdBy?: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    paidBy?: mongoose.Types.ObjectId;
    paidAt?: Date;
    paymentMethod?: string;
    bankReference?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PayrollRun: mongoose.Model<IPayrollRun, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollRun, {}, {}> & IPayrollRun & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayrollRun.d.ts.map