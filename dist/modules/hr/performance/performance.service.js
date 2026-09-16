"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceService = void 0;
const Performance_1 = require("../../../models/Performance");
const Employee_1 = require("../../../models/Employee");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class PerformanceService {
    static async getAll(query) {
        const { period, page = 1, limit = 50 } = query;
        const filter = {};
        if (period)
            filter.period = period;
        const [records, total] = await Promise.all([
            Performance_1.Performance.find(filter)
                .populate('employeeId', 'firstName lastName employeeCode department')
                .sort({ score: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Performance_1.Performance.countDocuments(filter),
        ]);
        return { data: records, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getStats() {
        const [avgResult, flagsResult, reviewsDueResult] = await Promise.all([
            Performance_1.Performance.aggregate([{ $group: { _id: null, avgScore: { $avg: '$score' } } }]),
            Performance_1.Performance.aggregate([{ $unwind: '$flags' }, { $count: 'total' }]),
            Performance_1.Performance.countDocuments({
                reviewDueDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            }),
        ]);
        const avgScore = avgResult.length > 0 ? Math.round(avgResult[0].avgScore * 100) / 100 : 0;
        const openFlags = flagsResult.length > 0 ? flagsResult[0].total : 0;
        const reviewsDue = reviewsDueResult;
        const topDept = await Performance_1.Performance.aggregate([
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
        return Performance_1.Performance.find()
            .populate('employeeId', 'firstName lastName employeeCode department')
            .sort({ score: -1 })
            .limit(5);
    }
    static async getReviewsDue() {
        const now = new Date();
        const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return Performance_1.Performance.find({
            $or: [
                { reviewDueDate: { $lte: thirtyDaysOut, $gte: now } },
                { reviewDueDate: { $lt: now } },
            ],
        })
            .populate('employeeId', 'firstName lastName employeeCode department')
            .sort({ reviewDueDate: 1 });
    }
    static async createOrUpdate(data, auditCtx) {
        const employee = await Employee_1.Employee.findById(data.employeeId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const existing = await Performance_1.Performance.findOne({ employeeId: data.employeeId, period: data.period });
        let record;
        if (existing) {
            const oldScore = existing.score;
            Object.assign(existing, data);
            if (data.score !== undefined) {
                existing.trend = data.score - oldScore;
            }
            await existing.save();
            record = existing;
            if (auditCtx) {
                AuditService_1.AuditService.log({
                    userId: auditCtx.userId,
                    action: 'PERFORMANCE_UPDATE',
                    entity: 'Performance',
                    entityId: record._id.toString(),
                    newValues: data,
                    ipAddress: auditCtx.ip,
                    userAgent: auditCtx.ua,
                });
            }
            EventBus_1.eventBus.emit('hr.performance.updated', { performanceId: record._id, employeeId: data.employeeId });
        }
        else {
            record = await Performance_1.Performance.create({
                ...data,
                trend: 0,
            });
            if (auditCtx) {
                AuditService_1.AuditService.log({
                    userId: auditCtx.userId,
                    action: 'PERFORMANCE_CREATE',
                    entity: 'Performance',
                    entityId: record._id.toString(),
                    newValues: data,
                    ipAddress: auditCtx.ip,
                    userAgent: auditCtx.ua,
                });
            }
            EventBus_1.eventBus.emit('hr.performance.created', { performanceId: record._id, employeeId: data.employeeId });
        }
        return record;
    }
}
exports.PerformanceService = PerformanceService;
//# sourceMappingURL=performance.service.js.map