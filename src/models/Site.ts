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
  contactPerson?: string;
  contactPhone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    siteName: { type: String, required: true, trim: true },
    siteCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    client: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    siteType: { type: String, enum: Object.values(SiteType), required: true },
    status: { type: String, enum: Object.values(SiteStatus), default: SiteStatus.ACTIVE },
    latitude: { type: Number },
    longitude: { type: Number },
    radiusMeters: { type: Number, default: 100 },
    agreedManpower: { type: Number, required: true },
    actualManpower: { type: Number, required: true },
    contactPerson: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  { timestamps: true }
);

siteSchema.index({ siteCode: 1 });
siteSchema.index({ status: 1 });

export const Site = mongoose.model<ISite>('Site', siteSchema);
