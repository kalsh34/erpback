import mongoose, { Schema, Document } from 'mongoose';

export interface IApprovalTier {
  tierNumber: number;
  name: string;
  minAmount: number;
  maxAmount: number | null; // null for unbounded top tier
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

const approvalTierSchema = new Schema<IApprovalTier>(
  {
    tierNumber: { type: Number, required: true },
    name: { type: String, required: true },
    minAmount: { type: Number, required: true, default: 0 },
    maxAmount: { type: Number, default: null },
    requiredRoles: [{ type: String, required: true }],
  },
  { _id: false }
);

const purchaseSettingsSchema = new Schema<IPurchaseSettings>(
  {
    approvalTiers: {
      type: [approvalTierSchema],
      default: [
        {
          tierNumber: 1,
          name: 'Department Approval',
          minAmount: 0,
          maxAmount: 50000,
          requiredRoles: ['HEAD', 'SUPER_ADMIN', 'CEO'],
        },
        {
          tierNumber: 2,
          name: 'Finance Approval',
          minAmount: 50000,
          maxAmount: 500000,
          requiredRoles: ['FINANCE_OFFICER', 'SUPER_ADMIN', 'CEO'],
        },
        {
          tierNumber: 3,
          name: 'Executive Management Approval',
          minAmount: 500000,
          maxAmount: null,
          requiredRoles: ['CEO', 'SUPER_ADMIN'],
        },
      ],
    },
    nextRfqSeq: { type: Number, default: 1 },
    nextPoSeq: { type: Number, default: 1 },
    nextGrnSeq: { type: Number, default: 1 },
    nextBillSeq: { type: Number, default: 1 },
    standardVatPercent: { type: Number, default: 15 },
    defaultCurrency: { type: String, default: 'ETB' },
    defaultPaymentTerms: { type: String, default: 'NET_30' },
    companyName: { type: String, default: 'Vital Security PLC' },
    companyAddress: { type: String, default: 'Bole Road, Addis Ababa, Ethiopia' },
    companyTin: { type: String, default: '0012345678' },
    companyPhone: { type: String, default: '+251 11 612 3456' },
    companyEmail: { type: String, default: 'procurement@vitalsecurity.et' },
  },
  { timestamps: true }
);

export const PurchaseSettings = mongoose.model<IPurchaseSettings>('PurchaseSettings', purchaseSettingsSchema);
