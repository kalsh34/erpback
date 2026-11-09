import mongoose, { Schema, Document } from 'mongoose';
import { CompanyStatus } from '../types';

/**
 * PROFORMA CLIENT SITE — one guarded location belonging to a registered client
 * company. A proforma is always addressed to "[Company] — [Site]" so the site
 * list is filtered by the selected company and only ACTIVE companies expose
 * sites for quotation.
 */
export interface IProformaSite extends Document {
  companyId: mongoose.Types.ObjectId;
  siteName: string;
  address: string;
  city: string;
  region: string;
  specialRequirements: string;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

const proformaSiteSchema = new Schema<IProformaSite>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'ProformaCompany', required: true },
    siteName: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    region: { type: String, default: '', trim: true },
    specialRequirements: { type: String, default: '', trim: true, maxlength: 2000 },
    status: { type: String, enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE },
  },
  { timestamps: true }
);

proformaSiteSchema.index({ companyId: 1, siteName: 1 });
proformaSiteSchema.index({ status: 1 });

export const ProformaSite = mongoose.model<IProformaSite>('ProformaSite', proformaSiteSchema);
