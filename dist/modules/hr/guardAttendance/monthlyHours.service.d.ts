import mongoose from 'mongoose';
import { IGuardMonthlyHours } from '../../../models/GuardMonthlyHours';
export interface MonthlyHoursBucket {
    normalHours: number;
    holidayHours: number;
    sundayHours: number;
}
interface AuditCtx {
    ip?: string;
    ua?: string;
}
/**
 * MONTHLY TOTAL HOURS — the second attendance input mode.
 *
 * The site officer enters ONE total per guard + site + month and classifies
 * it into normal / holiday / sunday hours. Holiday and Sunday hours are
 * multiplied by the OT rate in payroll; normal hours are not.
 *
 * When a monthly sheet exists for a guard it takes precedence over the sum
 * of daily records — the two inputs are never silently mixed.
 */
export declare class GuardMonthlyHoursService {
    private static assertBucket;
    /** Guard, site and assignment checks shared by every write. */
    private static assertGuardSite;
    /**
     * Upsert the monthly sheet for one guard + site + month.
     * Previous values are kept in changeHistory (never overwritten silently).
     */
    static saveMonthly(params: {
        year: number;
        month: number;
        entries: ({
            guardId: string;
            siteId: string;
        } & MonthlyHoursBucket & {
            notes?: string;
        })[];
        userId: string;
        source?: string;
    }, auditCtx?: AuditCtx): Promise<{
        saved: {
            guardId: string;
            siteId: string;
            doc: IGuardMonthlyHours;
            created: boolean;
        }[];
        failed: {
            guardId: string;
            siteId?: string;
            message: string;
        }[];
    }>;
    /** Sum of ACTIVE daily records for the month, grouped by guard+site. */
    private static dailyTotalsForPeriod;
    /**
     * The monthly worksheet: for every guard assigned to a site, their saved
     * monthly sheet, the daily-record totals for comparison, and warnings when
     * the two inputs disagree.
     */
    static getMonthlySheet(year: number, month: number, siteId?: string): Promise<{
        periodKey: string;
        rows: ({
            assignment: {
                _id: mongoose.Types.ObjectId;
                role: "GUARD" | "SUPERVISOR";
                isPrimary: boolean;
                effectiveFrom: Date;
            };
            guard: {
                _id: any;
                employeeCode: any;
                firstName: any;
                lastName: any;
                status: any;
            };
            site: {
                _id: any;
                siteName: any;
                siteCode: any;
            };
            sheet: {
                _id: any;
                normalHours: number;
                holidayHours: number;
                sundayHours: number;
                notes: string;
            } | null;
            daily: {
                totalHours: number;
                holidayHours: number;
                normalHours: number;
            } | null;
            warnings: string[];
        } | null)[];
        stats: {
            assignedRows: number;
            savedSheets: number;
            guardsWithDaily: number;
            totalNormal: number;
            totalHoliday: number;
            totalSunday: number;
        };
    }>;
    /**
     * Canonical hours feed for guard payroll: monthly sheets win; daily sums
     * are the fallback. Holiday and Sunday hours must be priced at the OT rate.
     */
    static getPayrollHours(year: number, month: number, guardId?: string): Promise<{
        periodKey: string;
        guards: {
            guardId: string;
            sites: {
                siteId: string;
                siteName?: string;
                normalHours: number;
                holidayHours: number;
                sundayHours: number;
                source: "MONTHLY" | "DAILY";
            }[];
            totals: {
                normalHours: number;
                holidayHours: number;
                sundayHours: number;
            };
            source: "MONTHLY" | "DAILY";
        }[];
    }>;
}
export {};
//# sourceMappingURL=monthlyHours.service.d.ts.map