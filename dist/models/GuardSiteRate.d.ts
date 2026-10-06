import mongoose, { Document } from 'mongoose';
/**
 * Per Guard + Site + Payroll Period earning rates for ADDITIONAL (non-primary)
 * sites. Attendance never stores rates — payroll resolves them here at
 * generation/calculation time. If no rate exists for a guard's additional-site
 * hours in a period, the payroll record is flagged `rateMissing` and cannot be
 * submitted until Finance enters the rate.
 */
export interface IGuardSiteRate extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    payrollPeriodId: mongoose.Types.ObjectId;
    normalRate: number;
    holidayRate: number;
    setBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardSiteRate: mongoose.Model<IGuardSiteRate, {}, {}, {}, mongoose.Document<unknown, {}, IGuardSiteRate, {}, {}> & IGuardSiteRate & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardSiteRate.d.ts.map