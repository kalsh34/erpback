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
    /**
     * Permanent removal (force delete) — the site is deleted even when guards are
     * assigned to it or it already has operational history.
     *
     * Everything that references the site — guard assignments, shift assignments,
     * shift templates, attendance, monthly hours, site compensation, rotations,
     * rotation assignments, notes, price history, guard shifts and QR scans — is
     * removed in the same pass, and employees whose home site it was are reset, so
     * no row is left pointing at a site that no longer exists. Guard payroll
     * records are deliberately kept: they store their own site name/code snapshot,
     * so guard pay history survives the deletion. Use deactivate instead when the
     * history must stay visible in the site module itself.
     */
    static deletePermanent(id: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        siteName: string;
        removed: {
            label: string;
            count: number;
        }[];
        keptPayrollRecords: number;
    }>;
}
//# sourceMappingURL=site.service.d.ts.map