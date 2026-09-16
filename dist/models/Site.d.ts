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
    contactPerson?: string;
    contactPhone?: string;
    address?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Site: mongoose.Model<ISite, {}, {}, {}, mongoose.Document<unknown, {}, ISite, {}, {}> & ISite & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Site.d.ts.map