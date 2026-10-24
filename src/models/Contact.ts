import mongoose, { Schema, Document } from 'mongoose';
import { ContactType } from '../types';

export interface IContactPerson {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  isPrimary?: boolean;
}

export interface IContactBankInfo {
  bankName?: string;
  accountNumber?: string;
  branch?: string;
  iban?: string;
}

export interface IContact extends Document {
  code: string;
  name: string;
  contactType: ContactType;
  isSupplier: boolean;
  isCustomer: boolean;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  tin?: string;
  paymentTerms: string;
  currency: string;
  bankInfo?: IContactBankInfo;
  contactPersons: IContactPerson[];
  supplierCategory?: string;
  deliveryTerms?: string;
  supplierRating: number;
  preferredProductIds: mongoose.Types.ObjectId[];
  totalPurchaseSpend: number;
  totalOrdersCount: number;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contactPersonSchema = new Schema<IContactPerson>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const bankInfoSchema = new Schema<IContactBankInfo>(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    branch: { type: String, trim: true },
    iban: { type: String, trim: true },
  },
  { _id: false }
);

const contactSchema = new Schema<IContact>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactType: { type: String, enum: Object.values(ContactType), default: ContactType.COMPANY },
    isSupplier: { type: Boolean, default: true },
    isCustomer: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Ethiopia' },
    zipCode: { type: String, trim: true },
    tin: { type: String, trim: true },
    paymentTerms: { type: String, default: 'NET_30' },
    currency: { type: String, default: 'ETB', uppercase: true },
    bankInfo: { type: bankInfoSchema, default: {} },
    contactPersons: [contactPersonSchema],
    supplierCategory: { type: String, trim: true, default: 'DISTRIBUTOR' },
    deliveryTerms: { type: String, trim: true, default: 'EXW' },
    supplierRating: { type: Number, default: 5, min: 1, max: 5 },
    preferredProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    totalPurchaseSpend: { type: Number, default: 0 },
    totalOrdersCount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

contactSchema.index({ name: 1 });
contactSchema.index({ isSupplier: 1 });
contactSchema.index({ isCustomer: 1 });
contactSchema.index({ isActive: 1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);
