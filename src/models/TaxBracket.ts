import mongoose, { Schema, Document } from 'mongoose';

/** One progressive step. max = null means "up to infinity". rate is a percentage (e.g. 10 = 10%). */
export interface ITaxBracketLine {
  min: number;
  max: number | null;
  rate: number;
}

/** Which payroll system a table belongs to. Older rows (created before the
 *  split) carry no kind and are treated as GUARD. */
export type TaxTableKind = 'GUARD' | 'STAFF';

/**
 * INCOME TAX TABLE — date-effective set of progressive brackets applied to the
 * monthly taxable earnings. Re-created after the v1 teardown; shared
 * infrastructure for guard and staff payroll (each resolves its own kind).
 */
export interface ITaxBracket extends Document {
  name: string;
  kind?: TaxTableKind;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  brackets: ITaxBracketLine[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taxBracketSchema = new Schema<ITaxBracket>(
  {
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: ['GUARD', 'STAFF'], default: 'GUARD' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    brackets: [
      {
        min: { type: Number, required: true, min: 0 },
        max: { type: Number, default: null },
        rate: { type: Number, required: true, min: 0, max: 100 },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

taxBracketSchema.index({ effectiveFrom: -1 });

export const TaxBracket = mongoose.model<ITaxBracket>('TaxBracket', taxBracketSchema);
