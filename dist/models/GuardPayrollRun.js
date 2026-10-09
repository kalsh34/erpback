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
exports.GuardPayrollRun = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const guardPayrollRunSchema = new mongoose_1.Schema({
    periodKey: {
        type: String,
        required: true,
        unique: true,
        match: /^\d{4}-\d{2}$/,
    },
    status: {
        type: String,
        enum: Object.values(types_1.PayrollRecordStatus),
        default: types_1.PayrollRecordStatus.DRAFT,
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
    problems: [{
            employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
            employeeCode: { type: String },
            guardName: { type: String },
            code: { type: String, required: true },
            message: { type: String, required: true },
        }],
    returnHistory: [{
            reason: { type: String, required: true, trim: true },
            returnedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            returnedAt: { type: Date, default: Date.now },
        }],
    totals: {
        guards: { type: Number, default: 0 },
        grossEarnings: { type: Number, default: 0 },
        employeePension: { type: Number, default: 0 },
        employerPension: { type: Number, default: 0 },
        incomeTax: { type: Number, default: 0 },
        totalDeductions: { type: Number, default: 0 },
        netPay: { type: Number, default: 0 },
    },
}, { timestamps: true });
exports.GuardPayrollRun = mongoose_1.default.model('GuardPayrollRun', guardPayrollRunSchema);
//# sourceMappingURL=GuardPayrollRun.js.map