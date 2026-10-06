import mongoose, { Schema, Document } from 'mongoose';
import { SiteType, SiteStatus } from '../types';

export interface ISite extends Document {
  siteName: string;
  siteCode: string;
  companyId?: mongoose.Types.ObjectId;
  client?: string;
  location: string;
  siteType: SiteType;
  status: SiteStatus;
  latitude?: number;
  longitude?: number;
  radiusMeters: number;
  agreedManpower: number;
  actualManpower: number;
  /** Optional gender split of actual manpower */
  maleCount?: number;
  femaleCount?: number;
  // ── Company-style fields (site as child of company) ────────────────
  branch?: string;
  city?: string;
  subCity?: string;
  wereda?: string;
  taxCenter?: string;
  pensionSite?: string;
  agreementStartDate?: Date;
  agreementEndDate?: Date;
  numberOfEmployees?: number;
  paymentPrice?: number;
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  /** Set when site is deactivated */
  deactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    siteName: { type: String, required: true, trim: true },
    siteCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    client: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    siteType: { type: String, enum: Object.values(SiteType), required: true },
    status: { type: String, enum: Object.values(SiteStatus), default: SiteStatus.ACTIVE },
    latitude: { type: Number },
    longitude: { type: Number },
    radiusMeters: { type: Number, default: 100 },
    agreedManpower: { type: Number, required: true },
    actualManpower: { type: Number, required: true },
    maleCount: { type: Number, min: 0, default: undefined },
    femaleCount: { type: Number, min: 0, default: undefined },
    // Company-style fields (site as child of company)
    branch: { type: String, trim: true },
    city: { type: String, trim: true },
    subCity: { type: String, trim: true },
    wereda: { type: String, trim: true },
    taxCenter: { type: String, trim: true },
    pensionSite: { type: String, trim: true },
    agreementStartDate: { type: Date },
    agreementEndDate: { type: Date },
    numberOfEmployees: { type: Number, default: 0, min: 0 },
    paymentPrice: { type: Number, default: 0, min: 0 },
    contactPerson: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    deactivatedAt: { type: Date, default: undefined },
  },
  { timestamps: true }
);

siteSchema.index({ siteCode: 1 });
siteSchema.index({ status: 1 });

export const Site = mongoose.model<ISite>('Site', siteSchema);
