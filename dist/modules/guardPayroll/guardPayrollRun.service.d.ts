import mongoose from 'mongoose';
import { IGuardPayrollRun } from '../../models/GuardPayrollRun';
import { PayrollRecordStatus } from '../../types';
interface AuditCtx {
    ip?: string;
    ua?: string;
}
/**
 * GUARD PAYROLL RUN SERVICE — high-performance, batch-calculated orchestrator.
 */
export declare class GuardPayrollRunService {
    /**
     * Create or recalculate the run for a month using batch queries and bulk insert.
     */
    static calculate(periodKey: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static listRuns(filters?: {
        periodKey?: string;
        status?: string;
    }): Promise<(mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getRun(runId: string): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static getRecord(recordId: string): Promise<mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Guard self-service: the signed-in user's own payroll history. */
    static myPayroll(userId: string, periodKey?: string): Promise<(mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /** Attendance lock state for the UI (Operations/HR attendance pages). */
    static getAttendanceLock(periodKey: string): Promise<{
        locked: boolean;
        runId: string | null;
        runStatus: PayrollRecordStatus | null;
    }>;
    private static loadRun;
    private static assertStatus;
    /** CALCULATED → SUBMITTED. Locks attendance for the month. */
    static submit(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    /** SUBMITTED → CHECKED. */
    static check(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    /** CHECKED → APPROVED. Settles loan/advance balances for the deductions taken. */
    static approve(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    /**
     * SUBMITTED / CHECKED / APPROVED → RETURNED.
     * If returned after approval, loan settlements are safely rolled back to prevent double deduction.
     */
    static returnForCorrection(runId: string, reason: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    /** APPROVED → PAID. Final — the run is never re-opened after payment. */
    static markPaid(runId: string, paymentRef: string | undefined, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    /** Export bank disbursement batch CSV (CBE / Awash / Dashen / All). */
    static exportBankDisbursement(runId: string, bankFilter?: string): Promise<{
        filename: string;
        csv: string;
    }>;
    /** Statutory income tax schedule export (ERCA). */
    static exportTaxReport(runId: string): Promise<{
        filename: string;
        csv: string;
    }>;
    /** Statutory pension schedule export (POESSA 7% / 11%). */
    static exportPensionReport(runId: string): Promise<{
        filename: string;
        csv: string;
    }>;
    /** Formatted Official Payslip Document Data. */
    static getPayslip(recordId: string): Promise<{
        company: {
            name: string;
            address: string;
            department: string;
        };
        period: string;
        status: string;
        employee: {
            id: mongoose.Types.ObjectId;
            code: string;
            fullName: string;
            bankName: string | undefined;
            accountNumber: string | undefined;
            pensionEnrolled: boolean;
        };
        earnings: {
            primarySite: {
                name: string;
                code: string | undefined;
                normalHours: number;
                normalPay: number;
                sundayHours: number;
                sundayPay: number;
                holidayHours: number;
                holidayPay: number;
                transportPaid: number;
            };
            additionalSites: {
                name: string;
                code: string | undefined;
                totalHours: number;
                siteEarnings: number;
            }[];
            grossEarnings: number;
        };
        deductions: {
            employeePension: number;
            employerPension: number;
            incomeTax: number;
            otherDeductions: {
                deductionId: mongoose.Types.ObjectId;
                type: string;
                label: string;
                amount: number;
            }[];
            totalDeductions: number;
        };
        netPay: number;
        generatedAt: string;
        watermark: string;
    }>;
    private static log;
}
export {};
//# sourceMappingURL=guardPayrollRun.service.d.ts.map