import mongoose, { Document } from 'mongoose';
/**
 * One row per change of a site's billing figures (paymentPrice and, for
 * completeness, the head-count figure invoiced against). Written by
 * SiteService.update whenever the values change — the OLD price is never
 * lost, it stays here for billing, audits and reports.
 */
export interface ISitePriceHistory extends Document {
    siteId: mongoose.Types.ObjectId;
    /** Price BEFORE this change (null when the site is created). */
    previous: {
        paymentPrice: number;
        numberOfEmployees: number;
    };
    /** Price AFTER this change. */
    current: {
        paymentPrice: number;
        numberOfEmployees: number;
    };
    reason?: string;
    changedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SitePriceHistory: mongoose.Model<ISitePriceHistory, {}, {}, {}, mongoose.Document<unknown, {}, ISitePriceHistory, {}, {}> & ISitePriceHistory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SitePriceHistory.d.ts.map