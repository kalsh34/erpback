export interface AuditContext {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
}
export declare class AuditService {
    static log(context: AuditContext): Promise<void>;
    static getLogs(filters: {
        entity?: string;
        entityId?: string;
        userId?: string;
        action?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        logs: (import("mongoose").Document<unknown, {}, import("../../models/AuditLog").IAuditLog, {}, {}> & import("../../models/AuditLog").IAuditLog & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
//# sourceMappingURL=AuditService.d.ts.map