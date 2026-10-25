import mongoose, { Document } from 'mongoose';
export declare enum GuarantorType {
    PERSON = "PERSON",
    VEHICLE_COLLATERAL = "VEHICLE_COLLATERAL",
    PROPERTY_COLLATERAL = "PROPERTY_COLLATERAL"
}
export declare enum GuarantorVerificationStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED"
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
    documents: {
        url: string;
        fileName: string;
        description?: string;
    }[];
    verificationStatus: GuarantorVerificationStatus;
    verifiedById?: mongoose.Types.ObjectId;
    verifiedAt?: Date;
    rejectionReason?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Guarantor: mongoose.Model<IGuarantor, {}, {}, {}, mongoose.Document<unknown, {}, IGuarantor, {}, {}> & IGuarantor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Guarantor.d.ts.map