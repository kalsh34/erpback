import mongoose, { Document } from 'mongoose';
/**
 * PROFORMA NUMBER SEQUENCE — the sole authority for proforma numbering.
 *
 * One document per calendar year holds the running sequence; numbers are
 * allocated with an atomic findOneAndUpdate({ $inc }) so concurrent proforma
 * creations can never receive the same number (upsert + setDefaultsOnInsert
 * handle the first allocation of a year safely under concurrency). This is the
 * same pattern guard employee codes use in guard.service.ts.
 */
export interface IProformaSequence extends Document {
    /** Allocation key, e.g. 'PROFORMA-2026' (one counter per year). */
    key: string;
    /** Last allocated sequence value (1-based). */
    seq: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ProformaSequence: mongoose.Model<IProformaSequence, {}, {}, {}, mongoose.Document<unknown, {}, IProformaSequence, {}, {}> & IProformaSequence & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ProformaSequence.d.ts.map