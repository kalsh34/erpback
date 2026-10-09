import mongoose, { Document } from 'mongoose';
import { CompanyStatus } from '../types';
export interface ICompany extends Document {
    name: string;
    code: string;
    email?: string;
    phone?: string;
    tin?: string;
    paymentPrice: number;
    defaultOtPrice: number;
    agreementStartDate?: Date;
    agreementEndDate?: Date;
    status: CompanyStatus;
    address?: string;
    contactPerson?: string;
    /** Set when the company is deactivated */
    deactivatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Company: mongoose.Model<ICompany, {}, {}, {}, mongoose.Document<unknown, {}, ICompany, {}, {}> & ICompany & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Company.d.ts.map