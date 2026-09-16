import mongoose, { Schema, Document } from 'mongoose';

export enum PartyType {
  EMPLOYEE = 'EMPLOYEE',
  CUSTOMER = 'CUSTOMER',
  VENDOR = 'VENDOR',
  CONTACT = 'CONTACT',
}

export interface IParty extends Document {
  partyType: PartyType;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const partySchema = new Schema<IParty>(
  {
    partyType: { type: String, enum: Object.values(PartyType), required: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

partySchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

partySchema.set('toJSON', { virtuals: true });

partySchema.index({ partyType: 1 });
partySchema.index({ email: 1 });
partySchema.index({ lastName: 1, firstName: 1 });
partySchema.index({ tags: 1 });

export const Party = mongoose.model<IParty>('Party', partySchema);
