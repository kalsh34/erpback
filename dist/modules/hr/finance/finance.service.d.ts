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
    static getSiteRates(payrollPeriodId: string): Promise<(import("mongoose").Document<unknown, {}, import("../../../models/GuardSiteRate").IGuardSiteRate, {}, {}> & import("../../../models/GuardSiteRate").IGuardSiteRate & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static upsertSiteRates(payrollPeriodId: string, entries: {
        guardId: string;
        siteId: string;
        normalRate: number;
        holidayRate: number;
    }[], userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<any[]>;
    static deleteSiteRate(id: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<{
        id: string;
    }>;
}
//# sourceMappingURL=finance.service.d.ts.map