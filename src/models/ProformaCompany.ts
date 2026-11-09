import mongoose, { Schema, Document } from 'mongoose';
import { CompanyStatus } from '../types';

/**
 * PROFORMA CLIENT COMPANY (Proforma module — company registration).
 *
 * A company must be registered here, with at least one contact person, BEFORE
 * any proforma can be issued to it. TIN is the natural business key and is
 * unique (a duplicate TIN is a data-entry error, not a second company).
 *
 * This collection is deliberately separate from the HR `Company` model
 * (`models/Company.ts`), which describes the group's own operating entities and
 * carries payroll/agreement pricing. Marketing clients are commercial records
 * only: identity, billing address and contact persons.
 */

export enum CompanyKind {
  PRIVATE_LIMITED = 'PRIVATE_LIMITED',
  SHARE_COMPANY = 'SHARE_COMPANY',
  SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP',
  PARTNERSHIP = 'PARTNERSHIP',
  PUBLIC_ENTERPRISE = 'PUBLIC_ENTERPRISE',
  NGO = 'NGO',
  OTHER = 'OTHER',
}

export interface ICompanyContact {
  fullName: string;
  position: string;
  phone: string;
  email: string;
  isPrimary: boolean;
}

export interface IProformaCompany extends Document {
  name: string;
  nameAm: string;
  tin: string;
  registrationNumber: string;
  companyType: string;
  industry: string;
  address: string;
  city: string;
  region: string;
  country: string;
  primaryPhone: string;
  secondaryPhone: string;
  primaryEmail: string;
  website: string;
  status: CompanyStatus;
  contacts: ICompanyContact[];
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<ICompanyContact>(
  {
    fullName: { type: String, required: true, trim: true },
    position: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const proformaCompanySchema = new Schema<IProformaCompany>(
  {
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, default: '', trim: true },
    tin: { type: String, required: true, trim: true, uppercase: true },
    registrationNumber: { type: String, default: '', trim: true },
    companyType: { type: String, enum: Object.values(CompanyKind), default: CompanyKind.PRIVATE_LIMITED },
    industry: { type: String, default: '', trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true },
    primaryPhone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, default: '', trim: true },
    primaryEmail: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, default: '', trim: true },
    status: { type: String, enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE },
    contacts: { type: [contactSchema], default: [] },
    deactivatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

proformaCompanySchema.index({ tin: 1 }, { unique: true });
proformaCompanySchema.index({ name: 1 });
proformaCompanySchema.index({ status: 1 });

export const ProformaCompany = mongoose.model<IProformaCompany>('ProformaCompany', proformaCompanySchema);
