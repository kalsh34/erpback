"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardPayrollRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const guardPayrollRecordSchema = new mongoose_1.Schema({
    payrollPeriodId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    primarySiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', default: null },
    standardMonthlyHours: { type: Number, required: true },
    normalHours: { type: Number, default: 0 },
    otHours: { type: Number, default: 0 },
    regularOtHours: { type: Number, default: 0 },
    holidayOtHours: { type: Number, default: 0 },
    holidayHours: { type: Number, default: 0 },
    secondaryShiftPay: { type: Number, default: 0 },
    normalRate: { type: Number, default: 0 },
    otRate: { type: Number, default: 0 },
    holidayRate: { type: Number, default: 0 },
    holidayOtRate: { type: Number, default: 0 },
    normalSalary: { type: Number, default: 0 },
    workedSalary: { type: Number, default: 0 },
    otPay: { type: Number, default: 0 },
    regularOtPay: { type: Number, default: 0 },
    holidayOtPay: { type: Number, default: 0 },
    holidayPay: { type: Number, default: 0 },
    grossPay: { type: Number, default: 0 },
    contractSalary: { type: Number, default: 0 },
    expectedMonthlyHours: { type: Number, default: 0 },
    primaryHourlyRate: { type: Number, default: 0 },
    siteEarnings: {
        type: [
            {
                siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', default: null },
                siteName: { type: String },
                isPrimary: { type: Boolean, default: false },
                normalHours: { type: Number, default: 0 },
                holidayHours: { type: Number, default: 0 },
                normalRate: { type: Number, default: 0 },
                holidayRate: { type: Number, default: 0 },
                normalEarnings: { type: Number, default: 0 },
                holidayEarnings: { type: Number, default: 0 },
                rateMissing: { type: Boolean, default: false },
            },
        ],
        default: [],
    },
    primaryEarnings: { type: Number, default: 0 },
    additionalEarnings: { type: Number, default: 0 },
    allowances: {
        type: [{ label: { type: String }, amount: { type: Number }, taxable: { type: Boolean } }],
        default: [],
    },
    allowanceTotal: { type: Number, default: 0 },
    nonTaxableAllowances: { type: Number, default: 0 },
    grossEarnings: { type: Number, default: 0 },
    rateMissing: { type: Boolean, default: false },
    validationErrors: { type: [String], default: [] },
    snapshot: { type: mongoose_1.Schema.Types.Mixed },
    calculatedGrossPay: { type: Number },
    calculatedNetPay: { type: Number },
    overrides: {
        type: [
            {
                field: { type: String, enum: ['grossPay', 'netPay'], required: true },
                originalValue: { type: Number, required: true },
                overrideValue: { type: Number, required: true },
                reason: { type: String, required: true },
                by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
                at: { type: Date, required: true },
            },
        ],
        default: [],
    },
    baseComponent: { type: Number, default: 0 },
    employeePension: { type: Number, default: 0 },
    employerPension: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(types_1.PayrollRecordStatus), default: types_1.PayrollRecordStatus.DRAFT },
    submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    rateEnteredBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    rateEnteredAt: { type: Date },
    calculatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    calculatedAt: { type: Date },
    checkedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    returnedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    returnedAt: { type: Date },
    returnReason: { type: String },
    paymentDate: { type: Date },
    paymentMethod: { type: String },
    bankReference: { type: String },
}, { timestamps: true });
guardPayrollRecordSchema.index({ payrollPeriodId: 1, guardId: 1 }, { unique: true });
guardPayrollRecordSchema.index({ status: 1 });
exports.GuardPayrollRecord = mongoose_1.default.model('GuardPayrollRecord', guardPayrollRecordSchema);
//# sourceMappingURL=GuardPayrollRecord.js.map