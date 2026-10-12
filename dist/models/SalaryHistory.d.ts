import mongoose, { Document } from 'mongoose';
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
export declare const SalaryHistory: mongoose.Model<ISalaryHistory, {}, {}, {}, mongoose.Document<unknown, {}, ISalaryHistory, {}, {}> & ISalaryHistory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SalaryHistory.d.ts.map