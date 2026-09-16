import { IStaffPayrollRecord } from '../../../models/StaffPayrollRecord';
export declare class StaffPayrollService {
    static getAll(query: {
        payrollPeriodId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IStaffPayrollRecord, {}, {}> & IStaffPayrollRecord & Required<{
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
    static getById(id: string): Promise<IStaffPayrollRecord>;
    static updateSalaryInputs(recordId: string, data: Partial<{
        basicSalary: number;
        responsibilityAllowance: number;
        teleAllowance: number;
        taxableTransport: number;
        nonTaxableTransport: number;
        overtime: number;
        bonus: number;
        loanDeduction: number;
        otherDeductions: number;
    }>, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static calculate(recordId: string, auditCtx?: {
        userId: string;
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static submit(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static check(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static approve(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static enterOt(recordId: string, data: {
        regularOtHours?: number;
        holidayOtHours?: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static initiatePayment(recordId: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static confirmPaid(recordId: string, data: {
        paymentMethod: string;
        bankReference?: string;
        paymentDate: Date;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IStaffPayrollRecord>;
    static returnForCorrection(recordId: string, userId: string, reason: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }, userRole?: string): Promise<IStaffPayrollRecord>;
}
//# sourceMappingURL=officePayroll.service.d.ts.map