import mongoose, { Schema, Document } from 'mongoose';

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

const proformaSequenceSchema = new Schema<IProformaSequence>(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, required: true, min: 1, default: 1 },
  },
  { timestamps: true }
);

export const ProformaSequence = mongoose.model<IProformaSequence>('ProformaSequence', proformaSequenceSchema);
