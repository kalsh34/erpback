import mongoose, { Document } from 'mongoose';
export interface IApprovalTier {
    tierNumber: number;
    name: string;
    minAmount: number;
    maxAmount: number | null;
    requiredRoles: string[];
}
export interface IPurchaseSettings extends Document {
    approvalTiers: IApprovalTier[];
    nextRfqSeq: number;
    nextPoSeq: number;
    nextGrnSeq: number;
    nextBillSeq: number;
    standardVatPercent: number;
    defaultCurrency: string;
    defaultPaymentTerms: string;
    companyName: string;
    companyAddress: string;
    companyTin: string;
    companyPhone: string;
    companyEmail: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PurchaseSettings: mongoose.Model<IPurchaseSettings, {}, {}, {}, mongoose.Document<unknown, {}, IPurchaseSettings, {}, {}> & IPurchaseSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PurchaseSettings.d.ts.map