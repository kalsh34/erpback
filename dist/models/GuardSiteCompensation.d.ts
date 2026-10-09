import mongoose, { Document } from 'mongoose';
/**
 * GUARD SITE COMPENSATION — the agreed monthly compensation a site pays a
 * guard. Site-level (not per-guard) and effective-dated so historical payroll
 * stays accurate when rates change.
 *
 * This is the ONLY rate source for guard payroll. The legacy duplicate fields
 * are deliberately NOT read by payroll:
 *   PrimarySiteAssignment.hourlyRate, GuardProfile.rate, Site.paymentPrice,
 *   Company.paymentPrice / defaultOtPrice, Employee.salary / transportAllowance.
 *
 * Derived values are never stored — always computed by the engine:
 *   OT Rate                = compensationAmount / standardMonthlyHours (240)
 *   Sunday Structural      = OT Rate × 32
 *   Remaining              = compensationAmount − Sunday Structural
 *   Transport              = Remaining × transport%  (not taxable, primary only)
 *   Basic Salary           = Remaining − Transport
 *   Basic Hourly Rate      = Basic Salary / 208
 */
export interface IGuardSiteCompensation extends Document {
    siteId: mongoose.Types.ObjectId;
    compensationAmount: number;
    effectiveFrom: Date;
    /** null/undefined while this row is the current one. */
    effectiveTo?: Date | null;
    isCurrent: boolean;
    notes?: string;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardSiteCompensation: mongoose.Model<IGuardSiteCompensation, {}, {}, {}, mongoose.Document<unknown, {}, IGuardSiteCompensation, {}, {}> & IGuardSiteCompensation & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardSiteCompensation.d.ts.map