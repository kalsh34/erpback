import { IRFQ } from '../../../models/RFQ';
interface RFQQueryOptions {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    buyerId?: string;
    search?: string;
    sort?: string;
    dir?: string;
}
export declare class RFQService {
    private static calculateLineSubtotal;
    static getAll(options: RFQQueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
            _id: import("mongoose").Types.ObjectId;
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static submit(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static send(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static recordQuotation(id: string, quotes: {
        lineId: string;
        vendorPrice: number;
        discount?: number;
        tax?: number;
    }[], context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static approve(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static reject(id: string, reason: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static convertToPO(id: string, extraData: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../../models/PurchaseOrder").IPurchaseOrder, {}, {}> & import("../../../models/PurchaseOrder").IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static compareQuotations(productIds?: string[]): Promise<(import("mongoose").Document<unknown, {}, IRFQ, {}, {}> & IRFQ & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
}
export {};
//# sourceMappingURL=rfq.service.d.ts.map