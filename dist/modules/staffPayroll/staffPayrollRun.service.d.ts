import mongoose from 'mongoose';
import { IStaffPayrollRun } from '../../models/StaffPayrollRun';
interface AuditCtx {
    ip?: string;
    ua?: string;
}
/**
 * STAFF PAYROLL RUN SERVICE — contract-driven, high-performance batch calculations.
 */
export declare class StaffPayrollRunService {
    static calculate(periodKey: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static recalculate(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static listRuns(filters?: {
        periodKey?: string;
        status?: string;
    }): Promise<(mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getRun(runId: string): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static getRecord(recordId: string): Promise<mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    private static loadRun;
    private static assertStatus;
    static submit(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static check(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static approve(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
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
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        })[];
        attendance: import("../payrollCommon/attendanceSummary.service").RunAttendanceSummary;
    }>;
    static markPaid(runId: string, paymentRef: string | undefined, userId: string, auditCtx?: AuditCtx): Promise<{
        run: mongoose.Document<unknown, {}, IStaffPayrollRun, {}, {}> & IStaffPayrollRun & Required<{
            _id: mongoose.Types.ObjectId;
        }> & {
            __v: number;
        };
        records: (mongoose.Document<unknown, {}, import("../../models/StaffPayrollRecord").IStaffPayrollRecord, {}, {}> & import("../../models/StaffPayrollRecord").IStaffPayrollRecord & Required<{
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
    /** Formatted Official Staff Payslip Document Data. */
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
            department: string | undefined;
            jobPosition: string | undefined;
            bankName: string | undefined;
            accountNumber: string | undefined;
            pensionEnrolled: boolean;
        };
        earnings: {
            basicSalary: number;
            responsibilityAllowance: number;
            teleAllowance: number;
            taxableTransport: number;
            nonTaxableTransport: number;
            overtimeAmount: number;
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
        bonus: number;
        finalAmountPaid: number;
        generatedAt: string;
        watermark: string;
    }>;
    private static log;
}
export {};
//# sourceMappingURL=staffPayrollRun.service.d.ts.map