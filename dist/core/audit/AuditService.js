"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AuditLog_1 = require("../../models/AuditLog");
class AuditService {
    static async log(context) {
        try {
            await AuditLog_1.AuditLog.create({
                userId: context.userId,
                action: context.action,
                entity: context.entity,
                entityId: context.entityId,
                oldValues: context.oldValues,
                newValues: context.newValues,
                reason: context.reason,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            });
        }
        catch (err) {
            console.error('[AuditService] Failed to write audit log:', err);
        }
    }
    static async getLogs(filters) {
        const query = {};
        if (filters.entity)
            query.entity = filters.entity;
        if (filters.entityId)
            query.entityId = filters.entityId;
        if (filters.userId)
            query.userId = filters.userId;
        if (filters.action)
            query.action = filters.action;
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            AuditLog_1.AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'firstName lastName email'),
            AuditLog_1.AuditLog.countDocuments(query),
        ]);
        return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=AuditService.js.map