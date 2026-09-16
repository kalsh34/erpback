import { ICandidate } from '../../../models/Candidate';
export declare class CandidateService {
    static getAll(query: {
        stage?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, ICandidate, {}, {}> & ICandidate & Required<{
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
    static getById(id: string): Promise<ICandidate>;
    static create(data: Partial<ICandidate>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ICandidate>;
    static updateStage(id: string, stage: string, notes?: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ICandidate>;
    static reject(id: string, reason: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<ICandidate>;
    static getStats(): Promise<Record<string, number>>;
}
//# sourceMappingURL=candidate.service.d.ts.map