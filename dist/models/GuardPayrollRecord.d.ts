import mongoose, { Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';
export interface IGuardPayrollRecord extends Document {
    payrollPeriodId: mongoose.Types.ObjectId;
    guardId: mongoose.Types.ObjectId;
    primarySiteId?: mongoose.Types.ObjectId;
    standardMonthlyHours: number;
    normalHours: number;
    otHours: number;
    regularOtHours: number;
    holidayOtHours: number;
    holidayHours: number;
    secondaryShiftPay: number;
    normalRate: number;
    otRate: number;
    holidayRate: number;
    holidayOtRate: number;
    normalSalary: number;
    workedSalary: number;
    otPay: number;
    regularOtPay: number;
    holidayOtPay: number;
    holidayPay: number;
    grossPay: number;
    baseComponent: number;
    employeePension: number;
    employerPension: number;
    incomeTax: number;
    loanDeduction: number;
    totalDeductions: number;
    netPay: number;
    status: PayrollRecordStatus;
    submittedBy?: mongoose.Types.ObjectId;
    submittedAt?: Date;
    rateEnteredBy?: mongoose.Types.ObjectId;
    rateEnteredAt?: Date;
    calculatedBy?: mongoose.Types.ObjectId;
    calculatedAt?: Date;
    checkedBy?: mongoose.Types.ObjectId;
    checkedAt?: Date;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    paidBy?: mongoose.Types.ObjectId;
    paidAt?: Date;
    returnedBy?: mongoose.Types.ObjectId;
    returnedAt?: Date;
    returnReason?: string;
    paymentDate?: Date;
    paymentMethod?: string;
    bankReference?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const GuardPayrollRecord: mongoose.Model<IGuardPayrollRecord, {}, {}, {}, mongoose.Document<unknown, {}, IGuardPayrollRecord, {}, {}> & IGuardPayrollRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=GuardPayrollRecord.d.ts.map