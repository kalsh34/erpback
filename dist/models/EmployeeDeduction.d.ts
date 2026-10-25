import mongoose, { Document } from 'mongoose';
import { EmployeeDeductionType, DeductionStatus } from '../types';
/**
 * EMPLOYEE DEDUCTION — loans, advances, penalties and other deductions owned
 * by payroll (shared by guard and staff payroll later).
 *
 * Application rules:
 *   • LOAN / ADVANCE     — installment-based. Applies from the month of
 *     `startDate` onward while remainingBalance > 0; each payroll deducts
 *     min(monthlyInstallment ?? totalAmount, remainingBalance).
 *   • PENALTY / OTHER    — one-off amount applied only in `periodKey`.
 *
 * The amount actually deducted is snapshotted into the payroll record; the
 * remaining balance is reduced when the payroll run is finalized (APPROVED),
 * never while the run is still draft.
 */
export interface IEmployeeDeduction extends Document {
    employeeId: mongoose.Types.ObjectId;
    type: EmployeeDeductionType;
    label: string;
    /** Total value: loan principal, advance amount, or the one-off penalty. */
    totalAmount: number;
    /** Required for LOAN/ADVANCE. */
    monthlyInstallment?: number | null;
    /** Running balance for LOAN/ADVANCE (equals totalAmount at creation). */
    remainingBalance: number;
    /** LOAN/ADVANCE: first month the installment applies. */
    startDate?: Date | null;
    /** PENALTY/OTHER: the single month this deduction applies to (YYYY-MM). */
    periodKey?: string | null;
    notes?: string;
    status: DeductionStatus;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const EmployeeDeduction: mongoose.Model<IEmployeeDeduction, {}, {}, {}, mongoose.Document<unknown, {}, IEmployeeDeduction, {}, {}> & IEmployeeDeduction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=EmployeeDeduction.d.ts.map