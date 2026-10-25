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
exports.StaffPayrollRun = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const staffPayrollRunSchema = new mongoose_1.Schema({
    periodKey: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
    status: { type: String, enum: Object.values(types_1.PayrollRecordStatus), default: types_1.PayrollRecordStatus.DRAFT },
    problems: [
        {
            employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee' },
            employeeCode: String,
            employeeName: String,
            code: { type: String, enum: ['NO_ACTIVE_CONTRACT', 'MULTIPLE_ACTIVE_CONTRACTS'] },
            message: String,
        },
    ],
    totals: {
        employees: { type: Number, default: 0 },
        grossEarnings: { type: Number, default: 0 },
        employeePension: { type: Number, default: 0 },
        employerPension: { type: Number, default: 0 },
        incomeTax: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        netPay: { type: Number, default: 0 },
        bonus: { type: Number, default: 0 },
        finalAmountPaid: { type: Number, default: 0 },
    },
    calculatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    calculatedAt: { type: Date },
    submittedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    submittedAt: { type: Date },
    checkedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    checkedAt: { type: Date },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    paymentRef: { type: String, trim: true },
    returnedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    returnedAt: { type: Date },
    returnReason: { type: String, trim: true },
    returnHistory: [{ reason: String, by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }, at: Date, fromStatus: String }],
}, { timestamps: true });
exports.StaffPayrollRun = mongoose_1.default.model('StaffPayrollRun', staffPayrollRunSchema);
//# sourceMappingURL=StaffPayrollRun.js.map