import mongoose, { Schema, Document } from 'mongoose';
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

const rfqLineSchema = new Schema<IRFQLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    uom: { type: String, required: true, default: 'PCS' },
    requestedDate: { type: Date },
    estimatedPrice: { type: Number, default: 0, min: 0 },
    vendorPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 15, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const rfqSchema = new Schema<IRFQ>(
  {
    rfqNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    rfqDate: { type: Date, default: Date.now },
    requestingDepartment: { type: String, default: 'Purchasing', trim: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    expectedDeliveryDate: { type: Date },
    paymentTerms: { type: String, default: 'NET_30' },
    deliveryTerms: { type: String, default: 'EXW' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: Object.values(RFQStatus), default: RFQStatus.DRAFT },
    lines: [rfqLineSchema],
    totalEstimatedAmount: { type: Number, default: 0 },
    totalQuotedAmount: { type: Number, default: 0 },
    sentAt: { type: Date },
    quotationReceivedAt: { type: Date },
    approvedAt: { type: Date },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },
  { timestamps: true }
);

rfqSchema.index({ supplierId: 1 });
rfqSchema.index({ buyerId: 1 });
rfqSchema.index({ status: 1 });
rfqSchema.index({ rfqDate: -1 });

export const RFQ = mongoose.model<IRFQ>('RFQ', rfqSchema);
