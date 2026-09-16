import { ISite } from '../../../models/Site';
export declare class SiteService {
    static getAll(query: {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, ISite, {}, {}> & ISite & Required<{
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
    static getById(id: string): Promise<ISite>;
    static create(data: Partial<ISite>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISite>;
    static update(id: string, data: Partial<ISite>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ISite>;
    static delete(id: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<void>;
}
//# sourceMappingURL=site.service.d.ts.map