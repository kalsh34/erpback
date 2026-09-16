import mongoose, { Schema, Document } from 'mongoose';

export type EntryType = 'PAYROLL' | 'MANUAL' | 'ADJUSTMENT';
export type EntryStatus = 'POSTED' | 'PENDING' | 'VOID';

export interface IJournalLine {
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface IJournalEntry extends Document {
  entryNumber: string;
  entryDate: Date;
  entryType: EntryType;
  status: EntryStatus;
  description: string;
  reference: string;
  referenceModel?: string;
  referenceId?: mongoose.Types.ObjectId;
  lines: IJournalLine[];
  totalDebit: number;
  totalCredit: number;
  postedBy?: mongoose.Types.ObjectId;
  postedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidedAt?: Date;
  voidReason?: string;
  payrollPeriodId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const journalLineSchema = new Schema<IJournalLine>(
  {
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    description: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    entryNumber: { type: String, required: true, unique: true },
    entryDate: { type: Date, required: true },
    entryType: { type: String, enum: ['PAYROLL', 'MANUAL', 'ADJUSTMENT'], required: true },
    status: { type: String, enum: ['POSTED', 'PENDING', 'VOID'], default: 'POSTED' },
    description: { type: String, required: true },
    reference: { type: String, required: true },
    referenceModel: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    lines: [journalLineSchema],
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date },
    voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
    voidReason: { type: String },
    payrollPeriodId: { type: Schema.Types.ObjectId, ref: 'PayrollPeriod' },
  },
  { timestamps: true }
);

journalEntrySchema.index({ entryDate: -1 });
journalEntrySchema.index({ entryType: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ reference: 1 });
journalEntrySchema.index({ referenceModel: 1, referenceId: 1 });
journalEntrySchema.index({ payrollPeriodId: 1 });
journalEntrySchema.index({ 'lines.accountCode': 1 });

export const JournalEntry = mongoose.model<IJournalEntry>(
  'JournalEntry',
  journalEntrySchema
);
