import { IPerformance } from '../../../models/Performance';
export declare class PerformanceService {
    static getAll(query: {
        period?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IPerformance, {}, {}> & IPerformance & Required<{
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
    static getStats(): Promise<{
        avgScore: number;
        topDepartment: any;
        openFlags: any;
        reviewsDue: number;
    }>;
    static getTopPerformers(): Promise<(import("mongoose").Document<unknown, {}, IPerformance, {}, {}> & IPerformance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getReviewsDue(): Promise<(import("mongoose").Document<unknown, {}, IPerformance, {}, {}> & IPerformance & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static createOrUpdate(data: Partial<IPerformance>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IPerformance>;
}
//# sourceMappingURL=performance.service.d.ts.map