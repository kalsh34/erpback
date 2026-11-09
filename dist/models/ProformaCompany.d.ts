import mongoose, { Document } from 'mongoose';
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
export declare enum CompanyKind {
    PRIVATE_LIMITED = "PRIVATE_LIMITED",
    SHARE_COMPANY = "SHARE_COMPANY",
    SOLE_PROPRIETORSHIP = "SOLE_PROPRIETORSHIP",
    PARTNERSHIP = "PARTNERSHIP",
    PUBLIC_ENTERPRISE = "PUBLIC_ENTERPRISE",
    NGO = "NGO",
    OTHER = "OTHER"
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
export declare const ProformaCompany: mongoose.Model<IProformaCompany, {}, {}, {}, mongoose.Document<unknown, {}, IProformaCompany, {}, {}> & IProformaCompany & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ProformaCompany.d.ts.map