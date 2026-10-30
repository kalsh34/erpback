import { Types } from 'mongoose';
import { IProforma } from '../../models/Proforma';
import { Permission } from '../../types';
export interface ProformaContext {
    userId?: string;
    ip?: string;
    ua?: string;
    /** Effective per-user permissions from authenticate(); empty when absent.
     *  Used for conditional authorization below route gates — discount changes
     *  additionally require PROFORMA_DISCOUNT (Phase C policy). */
    permissions?: Permission[];
}
type RawInput = Record<string, any>;
export interface NormalizedClient {
    companyId: Types.ObjectId | null;
    name: string;
    contactPerson: string;
    tin: string;
    phone: string;
    email: string;
    address: string;
    recipient: string;
}
export declare class ProformaService {
    static getAll(options: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        companyId?: string;
        sort?: string;
        dir?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
            _id: Types.ObjectId;
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(input: RawInput, ctx: ProformaContext): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Draft-only editing.
     *  - client / vatRate / notes: merged field-wise over the current draft.
     *  - lines: if supplied, re-resolve every snapshot from the CURRENT library
     *    (a draft quote is still being composed); if absent, the existing line
     *    documents — with their already-frozen snapshots — are kept verbatim.
     * Money recomputed both ways; client totals are never trusted.
     */
    static update(id: string, input: RawInput, ctx: ProformaContext): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** DRAFT → ISSUED. Issuing a revision additionally supersedes its parent. */
    static issue(id: string, ctx: ProformaContext): Promise<{
        proforma: import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        superseded: IProforma | null;
    }>;
    /** DRAFT → VOID. Issued documents never transition to VOID (amend instead). */
    static void_(id: string, ctx: ProformaContext): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Amendments never rewrite an issued quotation: clone its documented values
     * (including the frozen snapshots) into a fresh DRAFT revision. Editing the
     * draft and issuing it supersedes this parent. A parent that is already
     * superseded — or that already has a live amendment — cannot be amended.
     */
    static amend(id: string, ctx: ProformaContext): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * PROFORMA NUMBERING — atomic allocation from a per-year counter document
     * (findOneAndUpdate/$inc upsert, same pattern as guard employee codes), so
     * concurrent creation cannot produce duplicate 'PRO-<YYYY>-####' numbers.
     */
    private static nextNumber;
    private static audit;
}
export {};
//# sourceMappingURL=proforma.service.d.ts.map