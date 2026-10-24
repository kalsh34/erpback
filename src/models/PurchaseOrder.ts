import mongoose, { Schema, Document } from 'mongoose';
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

const poLineSchema = new Schema<IPOLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    supplierProductCode: { type: String, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    uom: { type: String, required: true, default: 'PCS' },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 15, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: { type: Date },
    warehouse: { type: String, default: 'Main Warehouse' },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const approvalStepSchema = new Schema<IPOApprovalStep>(
  {
    role: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
    comments: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const revisionSchema = new Schema<IPORevision>(
  {
    revisionNumber: { type: Number, required: true },
    revisedAt: { type: Date, default: Date.now },
    revisedById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revisedByName: { type: String, required: true },
    reason: { type: String, required: true, trim: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    poDate: { type: Date, default: Date.now },
    rfqId: { type: Schema.Types.ObjectId, ref: 'RFQ', default: null },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    supplierContactPerson: { type: String, trim: true },
    supplierAddress: { type: String, trim: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, default: 'Purchasing', trim: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    paymentTerms: { type: String, default: 'NET_30' },
    deliveryTerms: { type: String, default: 'EXW' },
    expectedDeliveryDate: { type: Date },
    warehouse: { type: String, default: 'Main Warehouse', trim: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    termsAndConditions: {
      type: String,
      default: '1. Goods must be delivered in accordance with agreed specifications.\n2. Payment terms as stated in this order.\n3. The company reserves the right to reject defective items.',
    },
    lines: [poLineSchema],
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(POStatus), default: POStatus.DRAFT },
    approvalStage: { type: String, default: 'DRAFT' },
    approvalHistory: [approvalStepSchema],
    sentToVendorAt: { type: Date },
    revisionNumber: { type: Number, default: 0 },
    revisions: [revisionSchema],
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ buyerId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ poDate: -1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
