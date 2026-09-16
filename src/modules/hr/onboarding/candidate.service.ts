import { Candidate, ICandidate } from '../../../models/Candidate';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class CandidateService {
  static async getAll(query: { stage?: string; page?: number; limit?: number }) {
    const { stage, page = 1, limit = 50 } = query;
    const filter: any = {};
    if (stage) filter.stage = stage;
    const [candidates, total] = await Promise.all([
      Candidate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Candidate.countDocuments(filter),
    ]);
    return { data: candidates, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async getById(id: string): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw ApiError.notFound('Candidate not found');
    return candidate;
  }

  static async create(data: Partial<ICandidate>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<ICandidate> {
    const candidate = await Candidate.create({
      ...data,
      stageHistory: [{ stage: data.stage || 'APPLICATION', date: new Date() }],
    });

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CANDIDATE_CREATE',
        entity: 'Candidate',
        entityId: (candidate._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.candidate.created', { candidateId: candidate._id });

    return candidate;
  }

  static async updateStage(id: string, stage: string, notes?: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw ApiError.notFound('Candidate not found');

    const validStages = ['APPLICATION', 'SCREENING', 'INTERVIEW', 'EXAM', 'OFFER', 'HIRED', 'REJECTED'];
    if (!validStages.includes(stage)) throw ApiError.badRequest('Invalid stage');

    candidate.stage = stage as any;
    candidate.stageHistory.push({ stage, date: new Date(), notes });
    if (notes) candidate.notes = notes;

    await candidate.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CANDIDATE_STAGE_UPDATE',
        entity: 'Candidate',
        entityId: id,
        newValues: { stage, notes },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.candidate.stage-updated', { candidateId: id, stage });

    return candidate;
  }

  static async reject(id: string, reason: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<ICandidate> {
    const candidate = await Candidate.findById(id);
    if (!candidate) throw ApiError.notFound('Candidate not found');

    candidate.stage = 'REJECTED' as any;
    candidate.rejectionReason = reason;
    candidate.stageHistory.push({ stage: 'REJECTED', date: new Date(), notes: reason });

    await candidate.save();

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CANDIDATE_REJECT',
        entity: 'Candidate',
        entityId: id,
        newValues: { rejectionReason: reason },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.candidate.rejected', { candidateId: id, reason });

    return candidate;
  }

  static async getStats() {
    const stats = await Candidate.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const result: Record<string, number> = {};
    for (const s of stats) {
      result[s._id] = s.count;
    }
    return result;
  }
}
