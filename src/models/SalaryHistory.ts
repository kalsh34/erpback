import mongoose, { Schema, Document } from 'mongoose';

/**
 * One row per change of the pay package on an employee's contract. Written by
 * ContractService whenever wage/allowances are updated (and on creation), so
 * the old salary is never lost — it stays here for payroll history, audits and
 * reports.
 */
export interface ISalaryHistory extends Document {
  employeeId: mongoose.Types.ObjectId;
  contractId: mongoose.Types.ObjectId;
  effectiveFrom: Date;
  /** Pay package BEFORE this change (null for the first record of a contract). */
  previous: {
    wage: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableAllowance: number;
    transportAllowance: number;
  };
  /** Pay package AFTER this change. */
  current: {
    wage: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableAllowance: number;
    transportAllowance: number;
  };
  /** Why the package changed (free text; defaults to "Contract update"). */
  reason?: string;
  changedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const packageSchema = new Schema(
  {
    wage: { type: Number, default: 0 },
    responsibilityAllowance: { type: Number, default: 0 },
    teleAllowance: { type: Number, default: 0 },
    taxableTransport: { type: Number, default: 0 },
    nonTaxableAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
  },
  { _id: false }
);

const salaryHistorySchema = new Schema<ISalaryHistory>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    contractId: { type: Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    effectiveFrom: { type: Date, required: true },
    previous: packageSchema,
    current: packageSchema,
    reason: { type: String, trim: true },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'salary_history' }
);

export const SalaryHistory = mongoose.model<ISalaryHistory>('SalaryHistory', salaryHistorySchema);
