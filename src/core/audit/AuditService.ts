import { AuditLog } from '../../models/AuditLog';

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

export class AuditService {
  static async log(context: AuditContext): Promise<void> {
    try {
      await AuditLog.create({
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
    } catch (err) {
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  static async getLogs(filters: {
    entity?: string;
    entityId?: string;
    userId?: string;
    action?: string;
    page?: number;
    limit?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.entity) query.entity = filters.entity;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('userId', 'firstName lastName email'),
      AuditLog.countDocuments(query),
    ]);

    return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
