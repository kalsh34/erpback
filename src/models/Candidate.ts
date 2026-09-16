import mongoose, { Schema, Document } from 'mongoose';

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
  stageHistory: { stage: string; date: Date; notes?: string }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    position: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    stage: {
      type: String,
      enum: ['APPLICATION', 'SCREENING', 'INTERVIEW', 'EXAM', 'OFFER', 'HIRED', 'REJECTED'],
      default: 'APPLICATION',
    },
    rejectionReason: { type: String, trim: true },
    appliedDate: { type: Date, default: Date.now },
    stageHistory: [
      {
        stage: { type: String, required: true },
        date: { type: Date, required: true },
        notes: { type: String, trim: true },
      },
    ],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

candidateSchema.index({ stage: 1 });
candidateSchema.index({ position: 1 });
candidateSchema.index({ department: 1 });

export const Candidate = mongoose.model<ICandidate>('Candidate', candidateSchema);
