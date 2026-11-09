import { Types } from 'mongoose';
import { IProforma, IProformaItem } from '../../models/Proforma';
import type { MarketingCtx } from './company.service';
/** Auto-generated shift note (Step 3 of the issuing page), editable afterwards. */
export declare function buildShiftNote(items: IProformaItem[]): string;
export declare class ProformaService {
    static getAll(options: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        companyId?: string;
        from?: string;
        to?: string;
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
    /**
     * Validate + price the submitted lines. Headcount and line totals are always
     * recomputed here (rule 3): any client-supplied totalHeadcount/lineTotal is
     * ignored, and the rate may only differ from the catalog default when the
     * role allows overrides.
     */
    private static resolveItems;
    /** Rules 1 + site ownership: only an ACTIVE company and its ACTIVE site. */
    private static resolveRecipient;
    static create(input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Rule 4: once issued the document is frozen — only DRAFTs can be edited. */
    static update(id: string, input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static issue(id: string, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Lifecycle move (accept / expire / convert / cancel) per the transition map. */
    static setStatus(id: string, nextStatusRaw: unknown, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Atomic per-year allocation: 'PF/VGT/<YEAR>/<NNNN>'. Numbers are never
     * reused, even when a draft is cancelled (rule 7).
     */
    private static nextNumber;
    private static audit;
}
//# sourceMappingURL=proforma.service.d.ts.map