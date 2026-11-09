import mongoose, { Document } from 'mongoose';
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
export declare const ProformaSite: mongoose.Model<IProformaSite, {}, {}, {}, mongoose.Document<unknown, {}, IProformaSite, {}, {}> & IProformaSite & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ProformaSite.d.ts.map