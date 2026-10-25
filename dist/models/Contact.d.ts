import mongoose, { Document } from 'mongoose';
import { ContactType } from '../types';
export interface IContactPerson {
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    isPrimary?: boolean;
}
export interface IContactBankInfo {
    bankName?: string;
    accountNumber?: string;
    branch?: string;
    iban?: string;
}
export interface IContact extends Document {
    code: string;
    name: string;
    contactType: ContactType;
    isSupplier: boolean;
    isCustomer: boolean;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    tin?: string;
    paymentTerms: string;
    currency: string;
    bankInfo?: IContactBankInfo;
    contactPersons: IContactPerson[];
    supplierCategory?: string;
    deliveryTerms?: string;
    supplierRating: number;
    preferredProductIds: mongoose.Types.ObjectId[];
    totalPurchaseSpend: number;
    totalOrdersCount: number;
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Contact: mongoose.Model<IContact, {}, {}, {}, mongoose.Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Contact.d.ts.map