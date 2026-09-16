import mongoose, { Document } from 'mongoose';
export interface IPayrollApproval extends Document {
    payrollRecordId: mongoose.Types.ObjectId;
    payrollType: 'GUARD' | 'STAFF';
    action: string;
    performedBy: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
}
export declare const PayrollApproval: mongoose.Model<IPayrollApproval, {}, {}, {}, mongoose.Document<unknown, {}, IPayrollApproval, {}, {}> & IPayrollApproval & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PayrollApproval.d.ts.map