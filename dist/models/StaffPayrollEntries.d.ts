import mongoose, { Document } from 'mongoose';
import { DeductionStatus } from '../types';
/**
 * STAFF OVERTIME ENTRY — overtime pay entered per staff employee for one
 * payroll month. The amount (ETB) is what enters Gross and Taxable earnings;
 * `hours` is an optional reference field only. Amount entries are upserted per
 * employee+period, so re-entering for the same month replaces the value.
 */
export interface IStaffOvertimeEntry extends Document {
    employeeId: mongoose.Types.ObjectId;
    periodKey: string;
    amount: number;
    hours?: number | null;
    notes?: string;
    status: DeductionStatus;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
/** STAFF BONUS — paid OUTSIDE the payroll formula: never taxed, never
 *  pensionable, never in gross or deductions. Snapshotted into the record and
 *  added after Net Pay (Final Amount Paid = Net Pay + Bonus). */
export interface IStaffBonus extends Document {
    employeeId: mongoose.Types.ObjectId;
    periodKey: string;
    amount: number;
    label: string;
    status: DeductionStatus;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const StaffOvertimeEntry: mongoose.Model<IStaffOvertimeEntry, {}, {}, {}, mongoose.Document<unknown, {}, IStaffOvertimeEntry, {}, {}> & IStaffOvertimeEntry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const StaffBonus: mongoose.Model<IStaffBonus, {}, {}, {}, mongoose.Document<unknown, {}, IStaffBonus, {}, {}> & IStaffBonus & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=StaffPayrollEntries.d.ts.map