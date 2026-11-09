import mongoose, { Schema, Document } from 'mongoose';

/**
 * PROFORMA NUMBER SEQUENCE — the sole authority for proforma numbering.
 *
 * One counter document per calendar year, allocated with an atomic
 * findOneAndUpdate({ $inc }) so concurrent creations can never receive the same
 * number. Numbers follow 'PF/VGT/<YEAR>/<NNNN>' and are never reused, not even
 * after a draft is cancelled (rule 7).
 */
export interface IProformaSequence extends Document {
  /** Allocation key, e.g. 'PROFORMA-VGT-2026'. */
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
