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
exports.PurchaseSettings = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const approvalTierSchema = new mongoose_1.Schema({
    tierNumber: { type: Number, required: true },
    name: { type: String, required: true },
    minAmount: { type: Number, required: true, default: 0 },
    maxAmount: { type: Number, default: null },
    requiredRoles: [{ type: String, required: true }],
}, { _id: false });
const purchaseSettingsSchema = new mongoose_1.Schema({
    approvalTiers: {
        type: [approvalTierSchema],
        default: [
            {
                tierNumber: 1,
                name: 'Department Approval',
                minAmount: 0,
                maxAmount: 50000,
                requiredRoles: ['HEAD', 'SUPER_ADMIN', 'CEO'],
            },
            {
                tierNumber: 2,
                name: 'Finance Approval',
                minAmount: 50000,
                maxAmount: 500000,
                requiredRoles: ['FINANCE_OFFICER', 'SUPER_ADMIN', 'CEO'],
            },
            {
                tierNumber: 3,
                name: 'Executive Management Approval',
                minAmount: 500000,
                maxAmount: null,
                requiredRoles: ['CEO', 'SUPER_ADMIN'],
            },
        ],
    },
    nextRfqSeq: { type: Number, default: 1 },
    nextPoSeq: { type: Number, default: 1 },
    nextGrnSeq: { type: Number, default: 1 },
    nextBillSeq: { type: Number, default: 1 },
    standardVatPercent: { type: Number, default: 15 },
    defaultCurrency: { type: String, default: 'ETB' },
    defaultPaymentTerms: { type: String, default: 'NET_30' },
    companyName: { type: String, default: 'Vital Security PLC' },
    companyAddress: { type: String, default: 'Bole Road, Addis Ababa, Ethiopia' },
    companyTin: { type: String, default: '0012345678' },
    companyPhone: { type: String, default: '+251 11 612 3456' },
    companyEmail: { type: String, default: 'procurement@vitalsecurity.et' },
}, { timestamps: true });
exports.PurchaseSettings = mongoose_1.default.model('PurchaseSettings', purchaseSettingsSchema);
//# sourceMappingURL=PurchaseSettings.js.map