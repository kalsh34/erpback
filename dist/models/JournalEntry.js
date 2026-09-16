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
exports.JournalEntry = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const journalLineSchema = new mongoose_1.Schema({
    accountCode: { type: String, required: true },
    accountName: { type: String, required: true },
    description: { type: String, required: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
}, { _id: false });
const journalEntrySchema = new mongoose_1.Schema({
    entryNumber: { type: String, required: true, unique: true },
    entryDate: { type: Date, required: true },
    entryType: { type: String, enum: ['PAYROLL', 'MANUAL', 'ADJUSTMENT'], required: true },
    status: { type: String, enum: ['POSTED', 'PENDING', 'VOID'], default: 'POSTED' },
    description: { type: String, required: true },
    reference: { type: String, required: true },
    referenceModel: { type: String },
    referenceId: { type: mongoose_1.Schema.Types.ObjectId },
    lines: [journalLineSchema],
    totalDebit: { type: Number, required: true },
    totalCredit: { type: Number, required: true },
    postedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date },
    voidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
    voidReason: { type: String },
    payrollPeriodId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod' },
}, { timestamps: true });
journalEntrySchema.index({ entryDate: -1 });
journalEntrySchema.index({ entryType: 1 });
journalEntrySchema.index({ status: 1 });
journalEntrySchema.index({ reference: 1 });
journalEntrySchema.index({ referenceModel: 1, referenceId: 1 });
journalEntrySchema.index({ payrollPeriodId: 1 });
journalEntrySchema.index({ 'lines.accountCode': 1 });
exports.JournalEntry = mongoose_1.default.model('JournalEntry', journalEntrySchema);
//# sourceMappingURL=JournalEntry.js.map