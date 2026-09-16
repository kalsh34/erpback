export declare class PayrollJournalService {
    /**
     * Double-entry rule: debits must equal credits.
     * Debits : Salary Expense (worked basic + secondary) + OT Expense + Holiday Expense
     *          + Employer Pension Expense
     * Credits: Bank (net pay) + Income Tax Payable + Employee Pension Payable
     *          + EMPLOYER Pension Payable + Loan Payable
     */
    static postGuardPayroll(record: any, periodLabel: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("../../models/JournalEntry").IJournalEntry>;
    static postStaffPayroll(record: any, periodLabel: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<import("../../models/JournalEntry").IJournalEntry>;
}
//# sourceMappingURL=payrollJournal.service.d.ts.map