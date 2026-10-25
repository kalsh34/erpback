import mongoose, { Document } from 'mongoose';
/**
 * GUARD PAYROLL CONFIG — singleton (key = 'default') holding the
 * configurable constants of the guard payroll engine.
 *
 * Defaults implement the agreed rules:
 *   • transportPercent 20 (configurable, NOT taxable, primary site only)
 *   • standardMonthlyHours 240  → OT Rate = Compensation / 240
 *   • sundayStructuralHours 32  → Sunday Structural = OT Rate × 32
 *   • basicHourlyDivisor 208    → Basic Hourly Rate = Basic / 208 (NOT 240)
 */
export interface IGuardPayrollConfig extends Document {
    key: string;
    transportPercent: number;
    standardMonthlyHours: number;
    sundayStructuralHours: number;
    basicHourlyDivisor: number;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardPayrollConfig: mongoose.Model<IGuardPayrollConfig, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPayrollConfig, {}, {}> & IGuardPayrollConfig & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPayrollConfig.d.ts.map