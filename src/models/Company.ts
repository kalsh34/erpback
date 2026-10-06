import mongoose, { Schema, Document } from 'mongoose';
import { CompanyStatus } from '../types';

export interface ICompany extends Document {
  name: string;
  code: string;
  email?: string;
  phone?: string;
  tin?: string;
  paymentPrice: number;
  defaultOtPrice: number;
  agreementStartDate?: Date;
  agreementEndDate?: Date;
  status: CompanyStatus;
  address?: string;
  contactPerson?: string;
  /** Set when the company is deactivated */
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    tin: { type: String, trim: true },
    paymentPrice: { type: Number, default: 0, min: 0 },
    defaultOtPrice: { type: Number, default: 0, min: 0 },
    agreementStartDate: { type: Date, default: null },
    agreementEndDate: { type: Date, default: null },
    status: { type: String, enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE },
    address: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    deactivatedAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

companySchema.index({ name: 1 });
companySchema.index({ status: 1 });
companySchema.index({ tin: 1 });

export const Company = mongoose.model<ICompany>('Company', companySchema);
