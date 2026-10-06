import { IGuardPayrollRecord } from '../../../models/GuardPayrollRecord';
import { PayrollRecordStatus } from '../../../types';
export declare class GuardPayrollService {
    static getAll(query: {
        payrollPeriodId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IGuardPayrollRecord, {}, {}> & IGuardPayrollRecord & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    static getById(id: string): Promise<IGuardPayrollRecord>;
    static generateRecords(payrollPeriodId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord[]>;
    static enterOt(recordId: string, data: {
        regularOtHours?: number;
        holidayOtHours?: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static calculate(recordId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static submit(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static check(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static approve(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static initiatePayment(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static confirmPaid(recordId: string, data: {
        paymentMethod: string;
        bankReference?: string;
        paymentDate: Date;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    static returnForCorrection(recordId: string, userId: string, reason: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }, userRole?: string): Promise<IGuardPayrollRecord>;
    static updateHours(recordId: string, data: {
        normalHours?: number;
        otHours?: number;
        holidayHours?: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    /**
     * Manual payroll override with full audit trail (spec §21): stores the
     * engine-calculated original (calculatedGrossPay/calculatedNetPay, set once),
     * the override value, the reason, the user, and the timestamp. The effective
     * pay lives in grossPay/netPay; a netPay override adjusts grossPay by the
     * same delta so the journal entry stays balanced.
     */
    static override(recordId: string, data: {
        field: 'grossPay' | 'netPay';
        value: number;
        reason: string;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IGuardPayrollRecord>;
    /**
     * Validation-engine report for a period (spec §12): every record with a
     * missing rate or an open data-integrity error, so Finance sees exactly
     * what blocks finalization.
     */
    static validatePeriod(payrollPeriodId: string): Promise<{
        total: number;
        issueCount: number;
        readyCount: number;
        issues: {
            recordId: import("mongoose").Types.ObjectId;
            guard: import("mongoose").Types.ObjectId;
            primarySite: import("mongoose").Types.ObjectId | undefined;
            status: PayrollRecordStatus;
            rateMissing: boolean;
            missingRateSites: {
                siteId: import("mongoose").Types.ObjectId | null;
                siteName: string | undefined;
                normalHours: number;
                holidayHours: number;
            }[];
            validationErrors: string[];
        }[];
    }>;
}
//# sourceMappingURL=guardPayroll.service.d.ts.map