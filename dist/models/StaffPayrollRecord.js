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
exports.StaffPayrollRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const staffPayrollRecordSchema = new mongoose_1.Schema({
    runId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'StaffPayrollRun', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    snapshot: {
        employeeCode: { type: String, required: true },
        fullName: { type: String, required: true },
        department: { type: String },
        jobPosition: { type: String },
        contractId: { type: String, required: true },
        contractType: { type: String },
        basic: { type: Number, required: true, min: 0 },
        responsibilityAllowance: { type: Number, required: true, min: 0 },
        teleAllowance: { type: Number, required: true, min: 0 },
        taxableTransport: { type: Number, required: true, min: 0 },
        nonTaxableTransport: { type: Number, required: true, min: 0 },
        pensionEnrolled: { type: Boolean, required: true },
        bankName: { type: String },
        accountNumber: { type: String },
    },
    overtimeAmount: { type: Number, required: true, min: 0 },
    bonusAmount: { type: Number, required: true, min: 0 },
    grossEarnings: { type: Number, required: true },
    taxableEarnings: { type: Number, required: true },
    employeePension: { type: Number, required: true, min: 0 },
    employerPension: { type: Number, required: true, min: 0 },
    incomeTax: { type: Number, required: true, min: 0 },
    deductions: [{
            deductionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'EmployeeDeduction', required: true },
            type: { type: String, required: true },
            label: { type: String, required: true },
            amount: { type: Number, required: true },
        }],
    totalDeductions: { type: Number, required: true, min: 0 },
    netPay: { type: Number, required: true },
    bonus: { type: Number, required: true, min: 0 },
    finalAmountPaid: { type: Number, required: true },
    warnings: { type: [String], default: [] },
}, { timestamps: true });
staffPayrollRecordSchema.index({ runId: 1, employeeId: 1 }, { unique: true });
staffPayrollRecordSchema.index({ employeeId: 1, periodKey: 1 });
exports.StaffPayrollRecord = mongoose_1.default.model('StaffPayrollRecord', staffPayrollRecordSchema);
//# sourceMappingURL=StaffPayrollRecord.js.map