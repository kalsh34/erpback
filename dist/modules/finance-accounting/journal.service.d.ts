import { IJournalEntry, IJournalLine } from '../../models/JournalEntry';
export declare class JournalService {
    static createEntry(data: {
        entryType: IJournalEntry['entryType'];
        description: string;
        reference: string;
        referenceModel?: string;
        referenceId?: string;
        lines: IJournalLine[];
        payrollPeriodId?: string;
        userId?: string;
        ip?: string;
        ua?: string;
    }): Promise<IJournalEntry>;
    static voidEntry(entryId: string, reason: string, userId: string, auditCtx?: {
        ip?: string;
        ua?: string;
    }): Promise<IJournalEntry>;
    static getAll(query: {
        entryType?: string;
        status?: string;
        accountCode?: string;
        startDate?: string;
        endDate?: string;
        payrollPeriodId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: (import("mongoose").Document<unknown, {}, IJournalEntry, {}, {}> & IJournalEntry & Required<{
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
    static getById(id: string): Promise<IJournalEntry>;
    static getAccountSummary(query: {
        startDate?: string;
        endDate?: string;
        payrollPeriodId?: string;
    }): Promise<{
        accountCode: any;
        accountName: any;
        totalDebit: number;
        totalCredit: number;
        balance: number;
        entryCount: any;
    }[]>;
    static getDashboardSummary(): Promise<{
        totalRevenueYTD: number;
        totalExpensesYTD: number;
        netProfitYTD: number;
        monthlyRevenue: number;
        monthlyExpenses: number;
        cashBalance: number;
        accountSummary: {
            accountCode: any;
            accountName: any;
            totalDebit: number;
            totalCredit: number;
        }[];
        recentEntries: (import("mongoose").Document<unknown, {}, IJournalEntry, {}, {}> & IJournalEntry & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
}
//# sourceMappingURL=journal.service.d.ts.map