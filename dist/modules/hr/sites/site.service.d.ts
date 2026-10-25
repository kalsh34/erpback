import { ISite } from '../../../models/Site';
import mongoose from 'mongoose';
export declare class SiteService {
    /**
     * DEF-H1: a site may only reference a company that actually exists.
     * - `companyId` absent/empty/null           → stays null (site without parent)
     * - not a well-formed ObjectId (malformed)  → 400, nothing is written
     * - well-formed but no such Company row     → 404, nothing is written
     */
    static validateCompanyId(companyId: unknown): Promise<void>;
    static getAll(query: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
        sort?: string;
        dir?: string;
    }): Promise<{
        data: (mongoose.Document<unknown, {}, ISite, {}, {}> & ISite & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<ISite>;
    static create(data: Partial<ISite>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISite>;
    static update(id: string, data: Partial<ISite>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISite>;
    /**
     * Soft-deactivate: set status=INACTIVE, stamp deactivatedAt,
     * relieve all current PrimarySiteAssignments and active ShiftAssignments.
     * History (isCurrent=false rows) is kept for the Guards tab.
     */
    static delete(id: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<void>;
}
//# sourceMappingURL=site.service.d.ts.map