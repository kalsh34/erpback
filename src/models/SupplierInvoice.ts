import mongoose, { Schema, Document } from 'mongoose';
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

const billPaymentSchema = new Schema<IBillPayment>(
  {
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, default: 'BANK_TRANSFER' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: true }
);

const supplierInvoiceSchema = new Schema<ISupplierInvoice>(
  {
    billNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vendorInvoiceNumber: { type: String, trim: true },
    billDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    goodsReceiptId: { type: Schema.Types.ObjectId, ref: 'GoodsReceipt', default: null },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(BillStatus), default: BillStatus.DRAFT },
    journalEntryId: { type: Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    payments: [billPaymentSchema],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

supplierInvoiceSchema.index({ purchaseOrderId: 1 });
supplierInvoiceSchema.index({ supplierId: 1 });
supplierInvoiceSchema.index({ status: 1 });
supplierInvoiceSchema.index({ billDate: -1 });

export const SupplierInvoice = mongoose.model<ISupplierInvoice>('SupplierInvoice', supplierInvoiceSchema);
