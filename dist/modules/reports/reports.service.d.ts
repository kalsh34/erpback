/**
 * The legacy payroll reports were removed together with the old payroll
 * system. They will come back under the new staff/guard payroll design.
 */
export declare class ReportsService {
    static getPayrollSummary(_payrollPeriodId: string): Promise<void>;
    static getSiteLaborCost(_payrollPeriodId: string): Promise<void>;
    static getPaymentHistory(_filter: {
        page: number;
        limit: number;
        guardId?: string;
    }): Promise<void>;
}
//# sourceMappingURL=reports.service.d.ts.map