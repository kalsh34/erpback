export declare class ReportsService {
    static getPayrollSummary(payrollPeriodId: string): Promise<{
        guardSummary: {
            totalGuards: number;
            totalGrossPay: number;
            totalNetPay: number;
            totalTax: number;
            totalPension: number;
        };
        staffSummary: {
            totalStaff: number;
            totalGrossSalary: number;
            totalNetPay: number;
            totalTax: number;
            totalPension: number;
        };
    }>;
    static getSiteLaborCost(payrollPeriodId: string): Promise<{
        siteName: string;
        siteCode: string;
        totalCost: number;
        guardCount: number;
    }[]>;
    static getPaymentHistory(query: {
        startDate?: Date;
        endDate?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, import("../../models/GuardPayrollRecord").IGuardPayrollRecord, {}, {}> & import("../../models/GuardPayrollRecord").IGuardPayrollRecord & Required<{
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
}
//# sourceMappingURL=reports.service.d.ts.map