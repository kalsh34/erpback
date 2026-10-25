import mongoose, { Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';
/**
 * STAFF PAYROLL RUN — one office-staff payroll month.
 *
 * Lifecycle: DRAFT → CALCULATED → SUBMITTED → CHECKED → APPROVED → PAID
 * (plus RETURNED for corrections; recalculation only while DRAFT / CALCULATED /
 * RETURNED). Mirrors the guard payroll lifecycle so the two systems behave the
 * same way, while staying a separate system with its own records.
 *
 * Staff payroll is contract-driven (no attendance hours), so unlike guard
 * payroll it does not lock staff attendance.
 */
export interface IStaffPayrollProblem {
    employeeId: mongoose.Types.ObjectId;
    employeeCode: string;
    employeeName: string;
    code: 'NO_ACTIVE_CONTRACT' | 'MULTIPLE_ACTIVE_CONTRACTS';
    message: string;
}
export interface IStaffPayrollRun extends Document {
    periodKey: string;
    status: PayrollRecordStatus;
    problems: IStaffPayrollProblem[];
    totals: {
        employees: number;
        grossEarnings: number;
        employeePension: number;
        employerPension: number;
        incomeTax: number;
        totalDeductions: number;
        netPay: number;
        bonus: number;
        finalAmountPaid: number;
    };
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
    returnedBy?: mongoose.Types.ObjectId;
    returnedAt?: Date;
    returnReason?: string;
    returnHistory: {
        reason: string;
        by: mongoose.Types.ObjectId;
        at: Date;
        fromStatus: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const StaffPayrollRun: mongoose.Model<IStaffPayrollRun, {}, {}, {}, mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=StaffPayrollRun.d.ts.map