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
exports.RFQ = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const rfqLineSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    uom: { type: String, required: true, default: 'PCS' },
    requestedDate: { type: Date },
    estimatedPrice: { type: Number, default: 0, min: 0 },
    vendorPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 15, min: 0 },
    subtotal: { type: Number, default: 0, min: 0 },
}, { _id: true });
const rfqSchema = new mongoose_1.Schema({
    rfqNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    rfqDate: { type: Date, default: Date.now },
    requestingDepartment: { type: String, default: 'Purchasing', trim: true },
    buyerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', required: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    expectedDeliveryDate: { type: Date },
    paymentTerms: { type: String, default: 'NET_30' },
    deliveryTerms: { type: String, default: 'EXW' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: Object.values(types_1.RFQStatus), default: types_1.RFQStatus.DRAFT },
    lines: [rfqLineSchema],
    totalEstimatedAmount: { type: Number, default: 0 },
    totalQuotedAmount: { type: Number, default: 0 },
    sentAt: { type: Date },
    quotationReceivedAt: { type: Date },
    approvedAt: { type: Date },
    approvedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },
    purchaseOrderId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
}, { timestamps: true });
rfqSchema.index({ supplierId: 1 });
rfqSchema.index({ buyerId: 1 });
rfqSchema.index({ status: 1 });
rfqSchema.index({ rfqDate: -1 });
exports.RFQ = mongoose_1.default.model('RFQ', rfqSchema);
//# sourceMappingURL=RFQ.js.map