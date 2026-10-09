import mongoose, { Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';
/**
 * GUARD PAYROLL RUN — one payroll cycle for one calendar month (periodKey).
 * One run per month (unique index). The run carries the approval lifecycle;
 * the per-guard money lives in GuardPayrollRecord snapshots.
 *
 * Lifecycle: DRAFT → CALCULATED → SUBMITTED → CHECKED → APPROVED → PAID
 * (RETURNED re-opens a submitted run for correction and unlocks attendance).
 *
 * Locking rule: while the run is SUBMITTED or beyond, guard attendance for
 * that periodKey is locked — see GuardPayrollLockService.
 */
export interface IGuardPayrollRun extends Document {
    periodKey: string;
    status: PayrollRecordStatus;
    calculatedBy?: mongoose.Types.ObjectId;
    calculatedAt?: Date;
    submittedBy?: mongoose.Types.ObjectId;
    submittedAt?: Date;
    checkedBy?: mongoose.Types.ObjectId;
    checkedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    paidBy?: mongoose.Types.ObjectId;
    paidAt?: Date;
    paymentRef?: string;
    /** Guards that could not be calculated, with the reason (e.g. no primary site). */
    problems: {
        employeeId: mongoose.Types.ObjectId;
        employeeCode?: string;
        guardName?: string;
        code: string;
        message: string;
    }[];
    /** Audit trail of RETURN-for-correction actions. */
    returnHistory: {
        reason: string;
        returnedBy: mongoose.Types.ObjectId;
        returnedAt: Date;
    }[];
    totals: {
        guards: number;
        grossEarnings: number;
        employeePension: number;
        employerPension: number;
        incomeTax: number;
        totalDeductions: number;
        netPay: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardPayrollRun: mongoose.Model<IGuardPayrollRun, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPayrollRun.d.ts.map