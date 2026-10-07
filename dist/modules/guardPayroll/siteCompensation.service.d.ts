import mongoose from 'mongoose';
import { IGuardSiteCompensation } from '../../models/GuardSiteCompensation';
declare const DAY_MS: number;
/**
 * SITE COMPENSATION SERVICE — effective-dated agreed compensation per site.
 *
 * The compensation amount is the payroll source of truth. Historical payroll
 * stays accurate because each payroll record snapshots the amount used, and
 * lookups always resolve the row that was in force for the payroll month.
 */
export declare class SiteCompensationService {
    /** Full history for one site (newest first). */
    static listForSite(siteId: string): Promise<(mongoose.Document<unknown, {}, IGuardSiteCompensation, {}, {}> & IGuardSiteCompensation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /** All sites' compensations (optionally only current rows), site populated. */
    static listAll(opts?: {
        currentOnly?: boolean;
        siteId?: string;
    }): Promise<(mongoose.Document<unknown, {}, IGuardSiteCompensation, {}, {}> & IGuardSiteCompensation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /**
     * Record a new compensation amount for a site. The previous current row is
     * closed the day before the new row starts — history is never overwritten.
     */
    static create(input: {
        siteId: string;
        compensationAmount: number;
        effectiveFrom: string;
        notes?: string;
        userId: string;
    }): Promise<mongoose.Document<unknown, {}, IGuardSiteCompensation, {}, {}> & IGuardSiteCompensation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * Delete a compensation row. Only allowed when it is NOT the current row and
     * no payroll record was calculated with it.
     */
    static remove(id: string): Promise<mongoose.Document<unknown, {}, IGuardSiteCompensation, {}, {}> & IGuardSiteCompensation & Required<{
        _id: mongoose.Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /**
     * The compensation in force for a site across a payroll month window.
     * Throws when missing or when rows overlap (bad configuration).
     */
    static resolveForPeriod(siteId: string, periodStart: Date, periodEnd: Date): Promise<IGuardSiteCompensation>;
    /**
     * Batch lookup of compensations for multiple sites in a payroll window.
     * Returns Map<siteIdString, IGuardSiteCompensation>.
     */
    static getForSites(siteIds: string[], periodStart: Date, periodEnd?: Date): Promise<Map<string, IGuardSiteCompensation>>;
}
export { DAY_MS };
//# sourceMappingURL=siteCompensation.service.d.ts.map