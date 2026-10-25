import mongoose, { Document } from 'mongoose';
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
export declare const JournalEntry: mongoose.Model<IJournalEntry, {}, {}, {}, mongoose.Document<unknown, {}, IJournalEntry, {}, {}> & IJournalEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=JournalEntry.d.ts.map