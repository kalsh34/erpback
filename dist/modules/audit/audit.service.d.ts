export declare class AuditService {
    static log(data: {
        userId: string;
        action: string;
        entity: string;
        entityId?: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        reason?: string;
        ipAddress?: string;
        userAgent?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../models/AuditLog").IAuditLog, {}, {}> & import("../../models/AuditLog").IAuditLog & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getAll(query: {
        page?: number;
        limit?: number;
        entity?: string;
        userId?: string;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("../../models/AuditLog").IAuditLog, {}, {}> & import("../../models/AuditLog").IAuditLog & Required<{
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
    static getById(id: string): Promise<(import("mongoose").Document<unknown, {}, import("../../models/AuditLog").IAuditLog, {}, {}> & import("../../models/AuditLog").IAuditLog & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
}
//# sourceMappingURL=audit.service.d.ts.map