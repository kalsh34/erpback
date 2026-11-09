import { Types } from 'mongoose';
import type { MarketingCtx } from './company.service';
/**
 * Client sites. A site always belongs to a registered company and can only be
 * quoted while both it and its company are ACTIVE.
 */
export declare class ProformaSiteService {
    static getAll(options: {
        companyId?: string;
        search?: string;
        status?: string;
        activeOnly?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("../../models/ProformaSite").IProformaSite, {}, {}> & import("../../models/ProformaSite").IProformaSite & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, import("../../models/ProformaSite").IProformaSite, {}, {}> & import("../../models/ProformaSite").IProformaSite & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/ProformaSite").IProformaSite, {}, {}> & import("../../models/ProformaSite").IProformaSite & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, import("../../models/ProformaSite").IProformaSite, {}, {}> & import("../../models/ProformaSite").IProformaSite & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=site.service.d.ts.map