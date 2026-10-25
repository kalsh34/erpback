import mongoose, { Document } from 'mongoose';
/**
 * MONTHLY TOTAL HOURS — the second way to record guard attendance.
 *
 * The site officer enters ONE total per guard + site + month and classifies
 * it into three buckets:
 *   • normalHours  — regular working hours (paid at base rate)
 *   • holidayHours — public-holiday hours   (multiplied by OT rate in payroll)
 *   • sundayHours  — Sunday hours           (multiplied by OT rate in payroll)
 *
 * This is the monthly counterpart of GuardAttendanceRecord (daily hours).
 * Payroll consumes whichever input the site officer used for the month:
 * if monthly totals exist for a guard they take precedence over daily sums.
 */
export interface IGuardMonthlyHours extends Document {
    guardId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    periodKey: string;
    normalHours: number;
    holidayHours: number;
    sundayHours: number;
    notes?: string;
    source: string;
    recordedBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    changeHistory: {
        previous: {
            normalHours: number;
            holidayHours: number;
            sundayHours: number;
        };
        new: {
            normalHours: number;
            holidayHours: number;
            sundayHours: number;
        };
        reason?: string;
        changedBy: mongoose.Types.ObjectId;
        changedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardMonthlyHours: mongoose.Model<IGuardMonthlyHours, {}, {}, {}, mongoose.Document<unknown, {}, IGuardMonthlyHours, {}, {}> & IGuardMonthlyHours & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardMonthlyHours.d.ts.map