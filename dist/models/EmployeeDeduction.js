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
exports.EmployeeDeduction = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const employeeDeductionSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    type: { type: String, enum: Object.values(types_1.EmployeeDeductionType), required: true },
    label: { type: String, required: true, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    monthlyInstallment: { type: Number, default: null, min: 0 },
    remainingBalance: { type: Number, required: true, min: 0 },
    startDate: { type: Date, default: null },
    periodKey: { type: String, default: null, match: /^\d{4}-\d{2}$/ },
    notes: { type: String, trim: true },
    status: { type: String, enum: Object.values(types_1.DeductionStatus), default: types_1.DeductionStatus.ACTIVE },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
employeeDeductionSchema.index({ employeeId: 1, status: 1 });
employeeDeductionSchema.index({ periodKey: 1 });
exports.EmployeeDeduction = mongoose_1.default.model('EmployeeDeduction', employeeDeductionSchema);
//# sourceMappingURL=EmployeeDeduction.js.map