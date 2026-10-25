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
exports.SalaryHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const packageSchema = new mongoose_1.Schema({
    wage: { type: Number, default: 0 },
    responsibilityAllowance: { type: Number, default: 0 },
    teleAllowance: { type: Number, default: 0 },
    taxableTransport: { type: Number, default: 0 },
    nonTaxableAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
}, { _id: false });
const salaryHistorySchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    contractId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contract', required: true, index: true },
    effectiveFrom: { type: Date, required: true },
    previous: packageSchema,
    current: packageSchema,
    reason: { type: String, trim: true },
    changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'salary_history' });
exports.SalaryHistory = mongoose_1.default.model('SalaryHistory', salaryHistorySchema);
//# sourceMappingURL=SalaryHistory.js.map