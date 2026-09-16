import mongoose, { Document } from 'mongoose';
import { LoanStatus } from '../types';
export interface ILoan extends Document {
    employeeId: mongoose.Types.ObjectId;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    monthlyDeduction: number;
    status: LoanStatus;
    startDate: Date;
    endDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Loan: mongoose.Model<ILoan, {}, {}, {}, mongoose.Document<unknown, {}, ILoan, {}, {}> & ILoan & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Loan.d.ts.map