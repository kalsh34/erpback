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
exports.PayrollRun = exports.PayrollRunType = exports.PayrollRunStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var PayrollRunStatus;
(function (PayrollRunStatus) {
    PayrollRunStatus["DRAFT"] = "DRAFT";
    PayrollRunStatus["APPROVED"] = "APPROVED";
    PayrollRunStatus["PAID"] = "PAID";
})(PayrollRunStatus || (exports.PayrollRunStatus = PayrollRunStatus = {}));
var PayrollRunType;
(function (PayrollRunType) {
    PayrollRunType["GUARD"] = "GUARD";
    PayrollRunType["STAFF"] = "STAFF";
    PayrollRunType["ALL"] = "ALL";
})(PayrollRunType || (exports.PayrollRunType = PayrollRunType = {}));
const payrollRunSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    runType: { type: String, enum: Object.values(PayrollRunType), default: PayrollRunType.ALL },
    periodFrom: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    periodTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod', default: null },
    periodIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod' }],
    periodLabel: { type: String, required: true },
    status: { type: String, enum: Object.values(PayrollRunStatus), default: PayrollRunStatus.DRAFT },
    totalGross: { type: Number, default: 0 },
    totalNet: { type: Number, default: 0 },
    employeeCount: { type: Number, default: 0 },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    paidBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    paidAt: { type: Date },
    paymentMethod: { type: String },
    bankReference: { type: String },
}, { timestamps: true });
payrollRunSchema.index({ status: 1 });
payrollRunSchema.index({ createdAt: -1 });
exports.PayrollRun = mongoose_1.default.model('PayrollRun', payrollRunSchema);
//# sourceMappingURL=PayrollRun.js.map