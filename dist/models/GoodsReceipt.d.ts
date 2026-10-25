import mongoose, { Document } from 'mongoose';
import { GRNStatus } from '../types';
export interface IGRNLine {
    productId: mongoose.Types.ObjectId;
    orderedQuantity: number;
    previouslyReceived: number;
    receivedQuantity: number;
    remainingQuantity: number;
    rejectedQuantity: number;
    rejectionReason?: string;
    notes?: string;
}
export interface IGoodsReceipt extends Document {
    grnNumber: string;
    receiptDate: Date;
    purchaseOrderId: mongoose.Types.ObjectId;
    supplierId: mongoose.Types.ObjectId;
    warehouse: string;
    receivedById: mongoose.Types.ObjectId;
    vendorDeliveryNote?: string;
    status: GRNStatus;
    notes?: string;
    lines: IGRNLine[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const GoodsReceipt: mongoose.Model<IGoodsReceipt, {}, {}, {}, mongoose.Document<unknown, {}, IGoodsReceipt, {}, {}> & IGoodsReceipt & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GoodsReceipt.d.ts.map