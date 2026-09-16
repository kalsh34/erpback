import mongoose, { Schema, Document } from 'mongoose';

export enum GuarantorType {
  PERSON = 'PERSON',
  VEHICLE_COLLATERAL = 'VEHICLE_COLLATERAL',
  PROPERTY_COLLATERAL = 'PROPERTY_COLLATERAL',
}

export enum GuarantorVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface IGuarantor extends Document {
  employeeId: mongoose.Types.ObjectId;
  guarantorType: GuarantorType;
  fullName: string;
  phone: string;
  address?: string;
  relationship?: string;
  occupation?: string;
  idNumber?: string;
  vehicleType?: string;
  vehiclePlateNumber?: string;
  vehicleMake?: string;
  vehicleYear?: number;
  propertyType?: string;
  propertyLocation?: string;
  propertyTitleNumber?: string;
  estimatedValue?: number;
  documents: { url: string; fileName: string; description?: string }[];
  verificationStatus: GuarantorVerificationStatus;
  verifiedById?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const guarantorSchema = new Schema<IGuarantor>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    guarantorType: { type: String, enum: Object.values(GuarantorType), required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    relationship: { type: String, trim: true },
    occupation: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    vehicleType: { type: String, trim: true },
    vehiclePlateNumber: { type: String, trim: true },
    vehicleMake: { type: String, trim: true },
    vehicleYear: { type: Number },
    propertyType: { type: String, trim: true },
    propertyLocation: { type: String, trim: true },
    propertyTitleNumber: { type: String, trim: true },
    estimatedValue: { type: Number },
    documents: [{
      url: { type: String, required: true },
      fileName: { type: String, required: true },
      description: { type: String },
    }],
    verificationStatus: { type: String, enum: Object.values(GuarantorVerificationStatus), default: GuarantorVerificationStatus.PENDING },
    verifiedById: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

guarantorSchema.index({ employeeId: 1 });
guarantorSchema.index({ verificationStatus: 1 });

export const Guarantor = mongoose.model<IGuarantor>('Guarantor', guarantorSchema);
