import { AuditLog } from '../../models/AuditLog';

export class AuditService {
  static async log(data: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return AuditLog.create(data);
  }

  static async getAll(query: { page?: number; limit?: number; entity?: string; entityId?: string; userId?: string }) {
    const { page = 1, limit = 20, entity, entityId, userId } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (entity) filter.entity = entity;
    if (entityId) filter.entityId = entityId;
    if (userId) filter.userId = userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId'),
      AuditLog.countDocuments(filter),
    ]);
    return { data: logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string) {
    return AuditLog.findById(id).populate('userId');
  }
}
