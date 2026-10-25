import { IGoodsReceipt } from '../../../models/GoodsReceipt';
interface ReceiptQueryOptions {
    page?: number;
    limit?: number;
    purchaseOrderId?: string;
    supplierId?: string;
    warehouse?: string;
    search?: string;
    sort?: string;
    dir?: string;
}
export declare class ReceiptService {
    static getAll(options: ReceiptQueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, IGoodsReceipt, {}, {}> & IGoodsReceipt & Required<{
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IGoodsReceipt, {}, {}> & IGoodsReceipt & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IGoodsReceipt, {}, {}> & IGoodsReceipt & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=receipt.service.d.ts.map