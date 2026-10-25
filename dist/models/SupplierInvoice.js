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
exports.SupplierInvoice = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const billPaymentSchema = new mongoose_1.Schema({
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, default: 'BANK_TRANSFER' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    recordedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { _id: true });
const supplierInvoiceSchema = new mongoose_1.Schema({
    billNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vendorInvoiceNumber: { type: String, trim: true },
    billDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    purchaseOrderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
    goodsReceiptId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'GoodsReceipt', default: null },
    supplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', required: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(types_1.BillStatus), default: types_1.BillStatus.DRAFT },
    journalEntryId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'JournalEntry', default: null },
    payments: [billPaymentSchema],
    notes: { type: String, trim: true },
}, { timestamps: true });
supplierInvoiceSchema.index({ purchaseOrderId: 1 });
supplierInvoiceSchema.index({ supplierId: 1 });
supplierInvoiceSchema.index({ status: 1 });
supplierInvoiceSchema.index({ billDate: -1 });
exports.SupplierInvoice = mongoose_1.default.model('SupplierInvoice', supplierInvoiceSchema);
//# sourceMappingURL=SupplierInvoice.js.map