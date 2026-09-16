import { Performance, IPerformance } from '../../../models/Performance';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class PerformanceService {
  static async getAll(query: { period?: string; page?: number; limit?: number }) {
    const { period, page = 1, limit = 50 } = query;
    const filter: any = {};
    if (period) filter.period = period;
    const [records, total] = await Promise.all([
      Performance.find(filter)
        .populate('employeeId', 'firstName lastName employeeCode department')
        .sort({ score: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Performance.countDocuments(filter),
    ]);
    return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getStats() {
    const [avgResult, flagsResult, reviewsDueResult] = await Promise.all([
      Performance.aggregate([{ $group: { _id: null, avgScore: { $avg: '$score' } } }]),
      Performance.aggregate([{ $unwind: '$flags' }, { $count: 'total' }]),
      Performance.countDocuments({
        reviewDueDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const avgScore = avgResult.length > 0 ? Math.round(avgResult[0].avgScore * 100) / 100 : 0;
    const openFlags = flagsResult.length > 0 ? flagsResult[0].total : 0;
    const reviewsDue = reviewsDueResult;

    const topDept = await Performance.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
      { $group: { _id: '$employee.department', avgScore: { $avg: '$score' } } },
      { $sort: { avgScore: -1 } },
      { $limit: 1 },
    ]);

    return {
      avgScore,
      topDepartment: topDept.length > 0 ? topDept[0]._id : null,
      openFlags,
      reviewsDue,
    };
  }

  static async getTopPerformers() {
    return Performance.find()
      .populate('employeeId', 'firstName lastName employeeCode department')
      .sort({ score: -1 })
      .limit(5);
  }

  static async getReviewsDue() {
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return Performance.find({
      $or: [
        { reviewDueDate: { $lte: thirtyDaysOut, $gte: now } },
        { reviewDueDate: { $lt: now } },
      ],
    })
      .populate('employeeId', 'firstName lastName employeeCode department')
      .sort({ reviewDueDate: 1 });
  }

  static async createOrUpdate(data: Partial<IPerformance>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IPerformance> {
    const employee = await Employee.findById(data.employeeId);
    if (!employee) throw ApiError.notFound('Employee not found');

    const existing = await Performance.findOne({ employeeId: data.employeeId, period: data.period });

    let record: IPerformance;
    if (existing) {
      const oldScore = existing.score;
      Object.assign(existing, data);
      if (data.score !== undefined) {
        existing.trend = data.score - oldScore;
      }
      await existing.save();
      record = existing;

      if (auditCtx) {
        AuditService.log({
          userId: auditCtx.userId,
          action: 'PERFORMANCE_UPDATE',
          entity: 'Performance',
          entityId: (record._id as any).toString(),
          newValues: data as Record<string, unknown>,
          ipAddress: auditCtx.ip,
          userAgent: auditCtx.ua,
        });
      }
      eventBus.emit('hr.performance.updated', { performanceId: record._id, employeeId: data.employeeId });
    } else {
      record = await Performance.create({
        ...data,
        trend: 0,
      } as IPerformance);

      if (auditCtx) {
        AuditService.log({
          userId: auditCtx.userId,
          action: 'PERFORMANCE_CREATE',
          entity: 'Performance',
          entityId: (record._id as any).toString(),
          newValues: data as Record<string, unknown>,
          ipAddress: auditCtx.ip,
          userAgent: auditCtx.ua,
        });
      }
      eventBus.emit('hr.performance.created', { performanceId: record._id, employeeId: data.employeeId });
    }

    return record;
  }
}
