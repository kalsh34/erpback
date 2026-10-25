import mongoose, { Document } from 'mongoose';
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
export declare const Site: mongoose.Model<ISite, {}, {}, {}, mongoose.Document<unknown, {}, ISite, {}, {}> & ISite & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Site.d.ts.map