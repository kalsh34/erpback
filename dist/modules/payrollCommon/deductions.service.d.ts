import mongoose from 'mongoose';
import { IEmployeeDeduction } from '../../models/EmployeeDeduction';
import { EmployeeDeductionType } from '../../types';
export interface AppliableDeduction {
    deductionId: string;
    type: string;
    label: string;
    amount: number;
}
/** "YYYY-MM" of a Date using UTC parts (form dates arrive as UTC midnight). */
export declare function periodKeyOf(d: Date): string;
/**
 * EMPLOYEE DEDUCTIONS — loans / advances / penalties / other.
 * Shared by guard payroll and staff payroll.
 */
export declare class DeductionsService {
    /**
     * Deductions that apply to one employee for one payroll month.
     * LOAN/ADVANCE: installment, from the start month onward, capped by balance.
     * PENALTY/OTHER: one-off, applied only in their own periodKey.
     */
    static listForPeriod(employeeId: string, periodKey: string): Promise<AppliableDeduction[]>;
    /**
     * Batch fetch deductions for multiple employees in a single query (10x faster).
     */
    static listForPeriodBatch(employeeIds: (string | mongoose.Types.ObjectId)[], periodKey: string): Promise<Map<string, AppliableDeduction[]>>;
    /**
     * Reduce loan/advance balances for the deductions actually taken in a run.
     * Called once when the run is APPROVED — never while it is still draft.
     */
    static settleRun(records: {
        deductions: {
            deductionId: mongoose.Types.ObjectId | string;
            amount: number;
        }[];
    }[]): Promise<void>;
    /**
     * Rollback loan/advance balance reductions if an APPROVED run is RETURNED for correction.
     * Prevents double-deduction when payroll is recalculated and re-approved.
     */
    static revertRun(records: {
        deductions: {
            deductionId: mongoose.Types.ObjectId | string;
            amount: number;
        }[];
    }[]): Promise<void>;
    static list(filter: {
        employeeId?: string;
        status?: string;
    }): Promise<(mongoose.Document<unknown, {}, IEmployeeDeduction, {}, {}> & IEmployeeDeduction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static create(input: {
        employeeId: string;
        type: EmployeeDeductionType;
        label: string;
        totalAmount: number;
        monthlyInstallment?: number | null;
        startDate?: string | null;
        periodKey?: string | null;
        notes?: string;
        userId: string;
    }): Promise<IEmployeeDeduction>;
    static cancel(id: string): Promise<mongoose.Document<unknown, {}, IEmployeeDeduction, {}, {}> & IEmployeeDeduction & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
}
//# sourceMappingURL=deductions.service.d.ts.map