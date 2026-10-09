export declare class FinanceService {
    static setPayrollRates(payrollPeriodId: string, data: {
        normalRate: number;
        otRate: number;
        holidayRate: number;
    }, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("mongoose").Document<unknown, {}, import("../../../models/PayrollRate").IPayrollRate, {}, {}> & import("../../../models/PayrollRate").IPayrollRate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static getPayrollRates(payrollPeriodId: string): Promise<(import("mongoose").Document<unknown, {}, import("../../../models/PayrollRate").IPayrollRate, {}, {}> & import("../../../models/PayrollRate").IPayrollRate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }) | null>;
}
//# sourceMappingURL=finance.service.d.ts.map