import mongoose, { Document } from 'mongoose';
export declare enum PartyType {
    EMPLOYEE = "EMPLOYEE",
    CUSTOMER = "CUSTOMER",
    VENDOR = "VENDOR",
    CONTACT = "CONTACT"
}
export interface IParty extends Document {
    partyType: PartyType;
    firstName: string;
    middleName?: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    tags: string[];
    metadata: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Party: mongoose.Model<IParty, {}, {}, {}, mongoose.Document<unknown, {}, IParty, {}, {}> & IParty & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Party.d.ts.map