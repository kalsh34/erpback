import mongoose from 'mongoose';
import { IGuardPayrollRun } from '../../models/GuardPayrollRun';
import { PayrollRecordStatus } from '../../types';
interface AuditCtx {
    ip?: string;
    ua?: string;
}
/** Calculate-options: optional primary-site scope and add-only ('remaining') mode. */
export interface CalculateOptions {
    /** Only calculate guards whose primary site is this site ('ALL'/null = every site). */
    siteId?: string | null;
    /** full = replace scoped records; remaining = insert only guards with no record yet. */
    mode?: 'full' | 'remaining';
}
/**
 * GUARD PAYROLL RUN SERVICE — high-performance, batch-calculated orchestrator.
 */
export declare class GuardPayrollRunService {
    /**
     * Create or recalculate the run for a month using batch queries and bulk insert.
     */
    static calculate(periodKey: string, userId: string, auditCtx?: AuditCtx, opts?: CalculateOptions): Promise<{
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    private static calculateTransactional;
    /** Stable digest of authoritative inputs; an editable calculation may become stale. */
    private static inputFingerprint;
    /** Read-only period preflight, using the same canonical site-hours and effective rates as calculation. */
    static readiness(periodKey: string): Promise<{
        periodKey: string;
        ready: boolean;
        guardCount: number;
        issues: {
            code: string;
            employeeCode?: string;
            message: string;
        }[];
        lock: {
            locked: boolean;
            runId: string | null;
            runStatus: PayrollRecordStatus | null;
        };
        readyCount: number;
        runLevel: {
            code: string;
            message: string;
        }[];
        guardIssues: {
            code: string;
            message: string;
            count: number;
            guards: {
                employeeCode: string;
                message: string;
            }[];
        }[];
        rows: {
            employeeId: string;
            employeeCode: string;
            guardName: string;
            sites: {
                siteId: any;
                siteName: any;
                siteCode: any;
                isPrimary: boolean;
                compensationAmount: any;
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                source: string;
            }[];
        }[];
    }>;
    /** Status-guarded recalculation of an existing run by its id (keeps the run's site scope). */
    static recalculate(runId: string, userId: string, auditCtx?: AuditCtx): Promise<{
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    static listRuns(filters?: {
        periodKey?: string;
        status?: string;
    }): Promise<(mongoose.Document<unknown, {}, IGuardPayrollRun, {}, {}> & IGuardPayrollRun & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getRun(runId: string, siteId?: string): Promise<{
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    /**
     * Partial-run census for the run detail view: how many guards belong to the
     * run's site scope, how many of them are calculated, skipped, and simply not
     * included yet ("Calculate remaining" candidates). Read-only.
     */
    private static computePartial;
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
    /**
     * Re-check the run's status AFTER any async work at the exact moment of the
     * state-changing save. Closes the race where a run gets SUBMITTED/CHECKED/
     * APPROVED/PAID between the initial load and this save (two concurrent
     * lifecycle calls, or a parallel recalculate).
     */
    private static assertStatusAtSave;
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    private static submitTransactional;
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    private static checkTransactional;
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    private static approveTransactional;
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    private static returnTransactional;
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
        attendance: {
            periodKey: string;
            daysInMonth: number;
            kind: "GUARD";
            rows: {
                employeeId: string;
                source: string;
                sites: ({
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    otRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    totalHours: number;
                    siteEarnings: number;
                } | {
                    isPrimary: boolean;
                    siteId: mongoose.Types.ObjectId;
                    siteName: string;
                    siteCode?: string;
                    taxCenter?: string;
                    pensionCenter?: string;
                    compensationAmount: number;
                    transportPercent: number;
                    standardMonthlyHours: number;
                    sundayStructuralHours: number;
                    basicHourlyDivisor: number;
                    otRate: number;
                    sundayStructuralAllocation: number;
                    remaining: number;
                    transportFull: number;
                    basicSalary: number;
                    basicHourlyRate: number;
                    normalHours: number;
                    holidayHours: number;
                    sundayHours: number;
                    normalPay: number;
                    holidayPay: number;
                    sundayPay: number;
                    transportPaid: number;
                    siteEarnings: number;
                })[];
                normalHours: number;
                sundayHours: number;
                holidayHours: number;
                totalHours: number;
                standardMonthlyHours: number;
                percentageOfStandard: number;
                hasAttendance: boolean;
                suggestedAmount: null;
            }[];
        };
        partial: {
            scopeSiteId: string | null;
            scopeSiteName: string;
            guardsInScope: number;
            calculated: number;
            skipped: number;
            missing: number;
            partial: boolean;
        };
        skipped: {
            employeeId: mongoose.Types.ObjectId;
            employeeCode?: string;
            guardName?: string;
            code: string;
            message: string;
        }[];
    }>;
    /**
     * Every bank present in a combined staff + guard payroll month (deduped
     * from bank snapshots across StaffPayrollRecord + GuardPayrollRecord),
     * used to populate the export-menu bank list.
     */
    static listBanksInUse(periodKey?: string): Promise<{
        bank: string;
        count: number;
    }[]>;
    /** Export bank disbursement batch CSV (CBE / Awash / Dashen / All). */
    static exportBankDisbursement(runId: string, bankFilter?: string): Promise<{
        filename: string;
        csv: string;
    }>;
    /**
     * Statutory income tax schedule export — filtered by tax branch.
     * Guards declare under the private-organization schedule (branch 'GUARD');
     * office staff under the staff schedule ('STAFF').
     */
    static exportTaxReport(runId: string, taxBranch?: string): Promise<{
        filename: string;
        csv: string;
    }>;
    /**
     * Statutory pension schedule export — filtered by pension center.
     * Centers mirror the tax branch split: private-organization guards remit
     * via POESSA (Private Org), staff via their own scheme.
     */
    static exportPensionReport(runId: string, pensionCenter?: string): Promise<{
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
                siteId: mongoose.Types.ObjectId;
                siteName: string;
                siteCode?: string;
                taxCenter?: string;
                pensionCenter?: string;
                compensationAmount: number;
                transportPercent: number;
                standardMonthlyHours: number;
                sundayStructuralHours: number;
                basicHourlyDivisor: number;
                otRate: number;
                sundayStructuralAllocation: number;
                remaining: number;
                transportFull: number;
                basicSalary: number;
                basicHourlyRate: number;
                siteEarnings: number;
            };
            additionalSites: {
                name: string;
                code: string | undefined;
                totalHours: number;
                siteEarnings: number;
                siteId: mongoose.Types.ObjectId;
                siteName: string;
                siteCode?: string;
                taxCenter?: string;
                pensionCenter?: string;
                compensationAmount: number;
                otRate: number;
                normalHours: number;
                holidayHours: number;
                sundayHours: number;
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
        taxableEarnings: number;
        pensionBase: number;
        paymentRef: string | undefined;
        netPay: number;
        generatedAt: string;
        watermark: string;
    }>;
    private static log;
}
export {};
//# sourceMappingURL=guardPayrollRun.service.d.ts.map