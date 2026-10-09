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
const guardPayrollRecordSchema = new mongoose_1.Schema({
    runId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GuardPayrollRun', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    snapshot: {
        employeeCode: { type: String, required: true },
        fullName: { type: String, required: true },
        bankName: { type: String },
        accountNumber: { type: String },
        pensionEnrolled: { type: Boolean, default: false },
        contractType: { type: String },
        contractWage: { type: Number },
    },
    primarySite: {
        siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
        siteName: { type: String, required: true },
        siteCode: { type: String },
        compensationAmount: { type: Number, required: true },
        transportPercent: { type: Number, required: true },
        standardMonthlyHours: { type: Number, required: true },
        sundayStructuralHours: { type: Number, required: true },
        basicHourlyDivisor: { type: Number, required: true },
        otRate: { type: Number, required: true },
        sundayStructuralAllocation: { type: Number, required: true },
        remaining: { type: Number, required: true },
        transportFull: { type: Number, required: true },
        basicSalary: { type: Number, required: true },
        basicHourlyRate: { type: Number, required: true },
        normalHours: { type: Number, default: 0 },
        holidayHours: { type: Number, default: 0 },
        sundayHours: { type: Number, default: 0 },
        normalPay: { type: Number, default: 0 },
        holidayPay: { type: Number, default: 0 },
        sundayPay: { type: Number, default: 0 },
        transportPaid: { type: Number, default: 0 },
        siteEarnings: { type: Number, default: 0 },
    },
    additionalSites: [{
            siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
            siteName: { type: String, required: true },
            siteCode: { type: String },
            compensationAmount: { type: Number, required: true },
            otRate: { type: Number, required: true },
            normalHours: { type: Number, default: 0 },
            holidayHours: { type: Number, default: 0 },
            sundayHours: { type: Number, default: 0 },
            totalHours: { type: Number, default: 0 },
            siteEarnings: { type: Number, default: 0 },
        }],
    grossEarnings: { type: Number, default: 0 },
    pensionBase: { type: Number, default: 0 },
    taxableEarnings: { type: Number, default: 0 },
    employeePension: { type: Number, default: 0 },
    employerPension: { type: Number, default: 0 },
    incomeTax: { type: Number, default: 0 },
    deductions: [{
            deductionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'EmployeeDeduction', required: true },
            type: { type: String, required: true },
            label: { type: String, required: true },
            amount: { type: Number, required: true },
        }],
    totalDeductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    warnings: [{ type: String }],
}, { timestamps: true });
guardPayrollRecordSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
guardPayrollRecordSchema.index({ employeeId: 1, periodKey: 1 });
exports.GuardPayrollRecord = mongoose_1.default.model('GuardPayrollRecord', guardPayrollRecordSchema);
//# sourceMappingURL=GuardPayrollRecord.js.map