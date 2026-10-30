import { IServiceLibraryItem } from '../../models/ServiceLibraryItem';
export interface ServiceLibraryContext {
    userId?: string;
    ip?: string;
    ua?: string;
}
type ServiceLibraryInput = Partial<IServiceLibraryItem> & Record<string, any>;
export declare class ServiceLibraryService {
    static getAll(options: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        pricingModel?: string;
        active?: string;
        sort?: string;
        dir?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IServiceLibraryItem, {}, {}> & IServiceLibraryItem & Required<{
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
    static getById(id: string): Promise<import("mongoose").Document<unknown, {}, IServiceLibraryItem, {}, {}> & IServiceLibraryItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static create(input: ServiceLibraryInput, ctx: ServiceLibraryContext): Promise<import("mongoose").Document<unknown, {}, IServiceLibraryItem, {}, {}> & IServiceLibraryItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static update(id: string, input: ServiceLibraryInput, ctx: ServiceLibraryContext): Promise<import("mongoose").Document<unknown, {}, IServiceLibraryItem, {}, {}> & IServiceLibraryItem & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Soft deactivation. Entries referenced by future proformas are never hard-deleted. */
    static deactivate(id: string, ctx: ServiceLibraryContext): Promise<{
        success: boolean;
        message: string;
    }>;
    static reactivate(id: string, ctx: ServiceLibraryContext): Promise<{
        success: boolean;
        message: string;
    }>;
    private static audit;
}
export {};
//# sourceMappingURL=serviceLibrary.service.d.ts.map