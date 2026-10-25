import { ISupplierInvoice } from '../../../models/SupplierInvoice';
interface BillQueryOptions {
    page?: number;
    limit?: number;
    status?: string;
    supplierId?: string;
    purchaseOrderId?: string;
    search?: string;
    sort?: string;
    dir?: string;
}
export declare class BillService {
    static getAll(options: BillQueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(data: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static postBill(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static recordPayment(id: string, paymentData: any, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, ISupplierInvoice, {}, {}> & ISupplierInvoice & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
export {};
//# sourceMappingURL=bill.service.d.ts.map