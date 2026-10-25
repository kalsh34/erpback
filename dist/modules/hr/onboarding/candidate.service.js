"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandidateService = void 0;
const Candidate_1 = require("../../../models/Candidate");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class CandidateService {
    static async getAll(query) {
        const { stage, page = 1, limit = 50 } = query;
        const filter = {};
        if (stage)
            filter.stage = stage;
        const [candidates, total] = await Promise.all([
            Candidate_1.Candidate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
            Candidate_1.Candidate.countDocuments(filter),
        ]);
        return { data: candidates, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const candidate = await Candidate_1.Candidate.findById(id);
        if (!candidate)
            throw ApiError_1.ApiError.notFound('Candidate not found');
        return candidate;
    }
    static async create(data, auditCtx) {
        const candidate = await Candidate_1.Candidate.create({
            ...data,
            stageHistory: [{ stage: data.stage || 'APPLICATION', date: new Date() }],
        });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CANDIDATE_CREATE',
                entity: 'Candidate',
                entityId: candidate._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.candidate.created', { candidateId: candidate._id });
        return candidate;
    }
    static async updateStage(id, stage, notes, auditCtx) {
        const candidate = await Candidate_1.Candidate.findById(id);
        if (!candidate)
            throw ApiError_1.ApiError.notFound('Candidate not found');
        const validStages = ['APPLICATION', 'SCREENING', 'INTERVIEW', 'EXAM', 'OFFER', 'HIRED', 'REJECTED'];
        if (!validStages.includes(stage))
            throw ApiError_1.ApiError.badRequest('Invalid stage');
        candidate.stage = stage;
        candidate.stageHistory.push({ stage, date: new Date(), notes });
        if (notes)
            candidate.notes = notes;
        await candidate.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CANDIDATE_STAGE_UPDATE',
                entity: 'Candidate',
                entityId: id,
                newValues: { stage, notes },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.candidate.stage-updated', { candidateId: id, stage });
        return candidate;
    }
    static async reject(id, reason, auditCtx) {
        const candidate = await Candidate_1.Candidate.findById(id);
        if (!candidate)
            throw ApiError_1.ApiError.notFound('Candidate not found');
        candidate.stage = 'REJECTED';
        candidate.rejectionReason = reason;
        candidate.stageHistory.push({ stage: 'REJECTED', date: new Date(), notes: reason });
        await candidate.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CANDIDATE_REJECT',
                entity: 'Candidate',
                entityId: id,
                newValues: { rejectionReason: reason },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.candidate.rejected', { candidateId: id, reason });
        return candidate;
    }
    static async getStats() {
        const stats = await Candidate_1.Candidate.aggregate([
            { $group: { _id: '$stage', count: { $sum: 1 } } },
        ]);
        const result = {};
        for (const s of stats) {
            result[s._id] = s.count;
        }
        return result;
    }
}
exports.CandidateService = CandidateService;
//# sourceMappingURL=candidate.service.js.map