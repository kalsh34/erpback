import mongoose, { Document } from 'mongoose';
import { RFQStatus } from '../types';
export interface IRFQLine {
    _id?: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    description?: string;
    quantity: number;
    uom: string;
    requestedDate?: Date;
    estimatedPrice: number;
    vendorPrice?: number;
    discount: number;
    tax: number;
    subtotal: number;
}
export interface IRFQ extends Document {
    rfqNumber: string;
    rfqDate: Date;
    requestingDepartment: string;
    buyerId: mongoose.Types.ObjectId;
    supplierId: mongoose.Types.ObjectId;
    currency: string;
    expectedDeliveryDate?: Date;
    paymentTerms?: string;
    deliveryTerms?: string;
    reference?: string;
    notes?: string;
    status: RFQStatus;
    lines: IRFQLine[];
    totalEstimatedAmount: number;
    totalQuotedAmount: number;
    sentAt?: Date;
    quotationReceivedAt?: Date;
    approvedAt?: Date;
    approvedById?: mongoose.Types.ObjectId;
    rejectionReason?: string;
    purchaseOrderId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RFQ: mongoose.Model<IRFQ, {}, {}, {}, mongoose.Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=RFQ.d.ts.map