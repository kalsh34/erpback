import { IContact } from '../../../models/Contact';
interface QueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    isSupplier?: boolean | string;
    isCustomer?: boolean | string;
    category?: string;
    status?: string;
    sort?: string;
    dir?: string;
}
export declare class ContactService {
    static getAll(options: QueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
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
    static getById(id: string): Promise<{
        contact: import("mongoose").Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        recentOrders: (import("mongoose").Document<unknown, {}, import("../../../models/PurchaseOrder").IPurchaseOrder, {}, {}> & import("../../../models/PurchaseOrder").IPurchaseOrder & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static create(data: Partial<IContact>, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: Partial<IContact>, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IContact, {}, {}> & IContact & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static delete(id: string, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
//# sourceMappingURL=contact.service.d.ts.map