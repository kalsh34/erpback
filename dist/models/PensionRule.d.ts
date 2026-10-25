import mongoose, { Document } from 'mongoose';
/**
 * PENSION RULE — date-effective employee/employer percentages with optional
 * pensionable-salary caps. Re-created after the v1 teardown; shared by guard
 * and staff payroll. Guard payroll applies it ONLY to the primary-site salary
 * base (never to additional-site earnings, never to transport).
 */
export type PensionRuleKind = 'GUARD' | 'STAFF';
export interface IPensionRule extends Document {
    name: string;
    kind?: PensionRuleKind;
    employeePercent: number;
    employerPercent: number;
    minPensionableSalary?: number | null;
    maxPensionableSalary?: number | null;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PensionRule: mongoose.Model<IPensionRule, {}, {}, {}, mongoose.Document<unknown, {}, IPensionRule, {}, {}> & IPensionRule & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=PensionRule.d.ts.map