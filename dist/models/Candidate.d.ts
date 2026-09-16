import mongoose, { Document } from 'mongoose';
export interface ICandidate extends Document {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    position: string;
    department?: string;
    stage: 'APPLICATION' | 'SCREENING' | 'INTERVIEW' | 'EXAM' | 'OFFER' | 'HIRED' | 'REJECTED';
    rejectionReason?: string;
    appliedDate: Date;
    stageHistory: {
        stage: string;
        date: Date;
        notes?: string;
    }[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Candidate: mongoose.Model<ICandidate, {}, {}, {}, mongoose.Document<unknown, {}, ICandidate, {}, {}> & ICandidate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Candidate.d.ts.map