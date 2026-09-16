"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const AuditLog_1 = require("../../models/AuditLog");
class AuditService {
    static async log(data) {
        return AuditLog_1.AuditLog.create(data);
    }
    static async getAll(query) {
        const { page = 1, limit = 20, entity, userId } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (entity)
            filter.entity = entity;
        if (userId)
            filter.userId = userId;
        const [logs, total] = await Promise.all([
            AuditLog_1.AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId'),
            AuditLog_1.AuditLog.countDocuments(filter),
        ]);
        return { data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        return AuditLog_1.AuditLog.findById(id).populate('userId');
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=audit.service.js.map