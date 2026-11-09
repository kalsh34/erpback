import { Types } from 'mongoose';
import { IServiceRole } from '../../models/ServiceRole';
import type { MarketingCtx } from './company.service';
/**
 * SERVICE ROLE catalog. Required on create (per the module spec): role code,
 * role name, default monthly rate, shift pattern and multiplier. Only ACTIVE
 * roles are offered when composing a proforma.
 */
export declare class ServiceRoleService {
    static getAll(options: {
        search?: string;
        status?: string;
        activeOnly?: string;
        category?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IServiceRole, {}, {}> & IServiceRole & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static getById(id: string): Promise<IServiceRole>;
    static create(input: Record<string, any>, ctx: MarketingCtx): Promise<import("mongoose").Document<unknown, {}, IServiceRole, {}, {}> & IServiceRole & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, input: Record<string, any>, ctx: MarketingCtx): Promise<IServiceRole>;
}
//# sourceMappingURL=serviceRole.service.d.ts.map