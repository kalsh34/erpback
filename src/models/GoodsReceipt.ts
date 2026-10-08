import mongoose, { Schema, Document } from 'mongoose';
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

const grnLineSchema = new Schema<IGRNLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    orderedQuantity: { type: Number, required: true, min: 0 },
    previouslyReceived: { type: Number, default: 0, min: 0 },
    receivedQuantity: { type: Number, required: true, min: 0 },
    remainingQuantity: { type: Number, default: 0, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    rejectionReason: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const goodsReceiptSchema = new Schema<IGoodsReceipt>(
  {
    grnNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    receiptDate: { type: Date, default: Date.now },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    warehouse: { type: String, default: 'Main Warehouse', trim: true },
    receivedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vendorDeliveryNote: { type: String, trim: true },
    status: { type: String, enum: Object.values(GRNStatus), default: GRNStatus.CONFIRMED },
    notes: { type: String, trim: true },
    lines: [grnLineSchema],
  },
  { timestamps: true }
);

goodsReceiptSchema.index({ purchaseOrderId: 1 });
goodsReceiptSchema.index({ supplierId: 1 });
goodsReceiptSchema.index({ receiptDate: -1 });

export const GoodsReceipt = mongoose.model<IGoodsReceipt>('GoodsReceipt', goodsReceiptSchema);
