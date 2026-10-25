import { ICompany } from '../../../models/Company';
import { CompanyStatus } from '../../../types';
type AuditCtx = {
    userId: string;
    ip?: string;
    ua?: string;
};
export declare class CompanyService {
    static getAll(query: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        sort?: string;
        dir?: string;
    }): Promise<{
        data: {
            siteCount: number;
            employeeCount: number;
            name: string;
            code: string;
            email?: string;
            phone?: string;
            tin?: string;
            paymentPrice: number;
            defaultOtPrice: number;
            agreementStartDate?: Date;
            agreementEndDate?: Date;
            status: CompanyStatus;
            address?: string;
            contactPerson?: string;
            deactivatedAt?: Date;
            createdAt: Date;
            updatedAt: Date;
            _id: import("mongoose").Types.ObjectId;
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
    static getById(id: string): Promise<ICompany>;
    /** Company + its sites (Name link / View action opens this). */
    static getDetail(id: string): Promise<{
        company: import("mongoose").Document<unknown, {}, ICompany, {}, {}> & ICompany & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        sites: (import("mongoose").Document<unknown, {}, import("../../../models/Site").ISite, {}, {}> & import("../../../models/Site").ISite & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    /** Auto code: CMP-0001 — skips codes already taken (safe under races). */
    private static nextCode;
    private static validateAgreementDates;
    static create(data: Partial<ICompany>, auditCtx?: AuditCtx): Promise<ICompany>;
    static update(id: string, data: Partial<ICompany>, auditCtx?: AuditCtx): Promise<ICompany>;
    /** Soft-deactivate: keeps sites/employees/history attached to the record. */
    static delete(id: string, auditCtx?: AuditCtx): Promise<void>;
}
export {};
//# sourceMappingURL=company.service.d.ts.map