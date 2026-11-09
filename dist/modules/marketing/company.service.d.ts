import { Types } from 'mongoose';
import { IProformaCompany, ICompanyContact } from '../../models/ProformaCompany';
import { CompanyStatus } from '../../types';
/** Request context used for the audit trail (user + origin). */
export interface MarketingCtx {
    userId?: string;
    ip?: string;
    ua?: string;
}
export declare class ProformaCompanyService {
    static getAll(options: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        sort?: string;
        dir?: string;
    }): Promise<{
        data: {
            siteCount: number;
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
            _id: Types.ObjectId;
            $locals: Record<string, unknown>;
            $op: "save" | "validate" | "remove" | null;
            $where: Record<string, unknown>;
            baseModelName?: string;
            collection: import("mongoose").Collection;
            db: import("mongoose").Connection;
            errors?: import("mongoose").Error.ValidationError;
            id?: any;
            isNew: boolean;
            schema: import("mongoose").Schema;
            __v: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<IProformaCompany>;
    static getDetail(id: string): Promise<{
        company: IProformaCompany;
        sites: (import("mongoose").Document<unknown, {}, import("../../models/ProformaSite").IProformaSite, {}, {}> & import("../../models/ProformaSite").IProformaSite & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static create(input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IProformaCompany, {}, {}> & IProformaCompany & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, input: Record<string, any>, ctx: MarketingCtx): Promise<IProformaCompany>;
    /** Soft deactivate — issued proformas keep pointing at the company. */
    static deactivate(id: string, ctx: MarketingCtx): Promise<IProformaCompany>;
}
//# sourceMappingURL=company.service.d.ts.map