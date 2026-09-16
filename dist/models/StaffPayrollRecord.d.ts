import mongoose, { Document } from 'mongoose';
import { PayrollRecordStatus } from '../types';
export interface IStaffPayrollRecord extends Document {
    payrollPeriodId: mongoose.Types.ObjectId;
    employeeId: mongoose.Types.ObjectId;
    formulaVersionId?: mongoose.Types.ObjectId;
    basicSalary: number;
    responsibilityAllowance: number;
    teleAllowance: number;
    taxableTransport: number;
    nonTaxableTransport: number;
    overtime: number;
    regularOtHours: number;
    holidayOtHours: number;
    regularOtPay: number;
    holidayOtPay: number;
    bonus: number;
    penalty: number;
    grossSalary: number;
    taxableSalary: number;
    incomeTax: number;
    employeePension: number;
    employerPension: number;
    loanDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
    netPay: number;
    status: PayrollRecordStatus;
    submittedBy?: mongoose.Types.ObjectId;
    submittedAt?: Date;
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
    attendanceDataMissing: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const StaffPayrollRecord: mongoose.Model<IStaffPayrollRecord, {}, {}, {}, mongoose.Document<unknown, {}, IStaffPayrollRecord, {}, {}> & IStaffPayrollRecord & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=StaffPayrollRecord.d.ts.map