import mongoose, { Document } from 'mongoose';
import { POStatus } from '../types';
export interface IPOLine {
    _id?: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    supplierProductCode?: string;
    description?: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    tax: number;
    subtotal: number;
    expectedDeliveryDate?: Date;
    warehouse?: string;
    receivedQuantity: number;
}
export interface IPOApprovalStep {
    role: string;
    userId: mongoose.Types.ObjectId;
    userName: string;
    action: 'APPROVED' | 'REJECTED';
    comments?: string;
    timestamp: Date;
}
export interface IPORevision {
    revisionNumber: number;
    revisedAt: Date;
    revisedById: mongoose.Types.ObjectId;
    revisedByName: string;
    reason: string;
    snapshot: any;
}
export interface IPurchaseOrder extends Document {
    poNumber: string;
    poDate: Date;
    rfqId?: mongoose.Types.ObjectId;
    supplierId: mongoose.Types.ObjectId;
    supplierContactPerson?: string;
    supplierAddress?: string;
    buyerId: mongoose.Types.ObjectId;
    department: string;
    currency: string;
    paymentTerms: string;
    deliveryTerms: string;
    expectedDeliveryDate?: Date;
    warehouse: string;
    reference?: string;
    notes?: string;
    termsAndConditions?: string;
    lines: IPOLine[];
    subtotal: number;
    totalTax: number;
    totalDiscount: number;
    grandTotal: number;
    status: POStatus;
    approvalStage: string;
    approvalHistory: IPOApprovalStep[];
    sentToVendorAt?: Date;
    revisionNumber: number;
    revisions: IPORevision[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const PurchaseOrder: mongoose.Model<IPurchaseOrder, {}, {}, {}, mongoose.Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PurchaseOrder.d.ts.map