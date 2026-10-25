import { IPurchaseOrder } from '../../../models/PurchaseOrder';
interface POQueryOptions {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    buyerId?: string;
    department?: string;
    search?: string;
    sort?: string;
    dir?: string;
}
export declare class POService {
    private static calculateTotals;
    static getAll(options: POQueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static submit(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static approve(id: string, comments: string, context: {
        userId?: string;
        userRole?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static reject(id: string, comments: string, context: {
        userId?: string;
        userRole?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static send(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static revise(id: string, data: {
        reason: string;
        lines: any[];
        expectedDeliveryDate?: Date;
    }, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IPurchaseOrder, {}, {}> & IPurchaseOrder & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=po.service.d.ts.map