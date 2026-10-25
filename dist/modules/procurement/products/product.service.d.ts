import { IProduct } from '../../../models/Product';
interface ProductQueryOptions {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    category?: string;
    supplierId?: string;
    lowStock?: boolean | string;
    status?: string;
    sort?: string;
    dir?: string;
}
export declare class ProductService {
    static getAll(options: ProductQueryOptions): Promise<{
        data: (import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
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
        product: import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        };
        purchaseHistory: any[];
    }>;
    static create(data: Partial<IProduct>, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, data: Partial<IProduct>, context: {
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
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
//# sourceMappingURL=product.service.d.ts.map