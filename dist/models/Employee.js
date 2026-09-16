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
exports.Employee = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const employeeSchema = new mongoose_1.Schema({
    employeeCode: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    category: { type: String, enum: Object.values(types_1.EmployeeCategory), required: true },
    status: { type: String, enum: Object.values(types_1.EmployeeStatus), default: types_1.EmployeeStatus.ACTIVE },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', default: null },
    partyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Party', default: null },
    homeSiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', default: null },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: Object.values(types_1.Gender) },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    hireDate: { type: Date },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    documents: [{
            title: { type: String, required: true, trim: true },
            url: { type: String, required: true },
            fileName: { type: String, required: true },
            uploadedAt: { type: Date, default: Date.now },
        }],
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    salary: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    statusHistory: [{
            from: { type: String, enum: Object.values(types_1.EmployeeStatus), required: true },
            to: { type: String, enum: Object.values(types_1.EmployeeStatus), required: true },
            reason: { type: String, required: true, trim: true },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
            changedAt: { type: Date, default: Date.now },
        }],
    guardInfo: {
        employmentType: { type: String, enum: Object.values(types_1.EmploymentType) },
        idCardNumber: { type: String, trim: true },
    },
}, { timestamps: true });
employeeSchema.virtual('fullName').get(function () {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.index({ employeeCode: 1 });
employeeSchema.index({ category: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ lastName: 1, firstName: 1 });
exports.Employee = mongoose_1.default.model('Employee', employeeSchema);
//# sourceMappingURL=Employee.js.map