import mongoose, { Schema, Document } from 'mongoose';

export interface ITaxBracket extends Document {
  label: string;
  brackets: {
    min: number;
    max: number | null;
    rate: number;
    deduction: number;
  }[];
  effectiveFrom: Date;
  effectiveTo?: Date;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const taxBracketSchema = new Schema<ITaxBracket>(
  {
    label: { type: String, required: true },
    brackets: [
      {
        min: { type: Number, required: true },
        max: { type: Number, default: null },
        rate: { type: Number, required: true },
        deduction: { type: Number, required: true },
      },
    ],
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taxBracketSchema.index({ isCurrent: 1 });

export const TaxBracket = mongoose.model<ITaxBracket>('TaxBracket', taxBracketSchema);
