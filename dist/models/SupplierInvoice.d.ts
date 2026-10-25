import mongoose, { Document } from 'mongoose';
import { BillStatus } from '../types';
export interface IBillPayment {
    paymentDate: Date;
    amount: number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    recordedById: mongoose.Types.ObjectId;
}
export interface ISupplierInvoice extends Document {
    billNumber: string;
    vendorInvoiceNumber?: string;
    billDate: Date;
    dueDate?: Date;
    purchaseOrderId: mongoose.Types.ObjectId;
    goodsReceiptId?: mongoose.Types.ObjectId;
    supplierId: mongoose.Types.ObjectId;
    currency: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    status: BillStatus;
    journalEntryId?: mongoose.Types.ObjectId;
    payments: IBillPayment[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SupplierInvoice: mongoose.Model<ISupplierInvoice, {}, {}, {}, mongoose.Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SupplierInvoice.d.ts.map