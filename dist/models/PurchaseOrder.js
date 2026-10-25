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
exports.PurchaseOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const poLineSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    supplierProductCode: { type: String, trim: true },
    description: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    uom: { type: String, required: true, default: 'PCS' },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 15, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    expectedDeliveryDate: { type: Date },
    warehouse: { type: String, default: 'Main Warehouse' },
    receivedQuantity: { type: Number, default: 0, min: 0 },
}, { _id: true });
const approvalStepSchema = new mongoose_1.Schema({
    role: { type: String, required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, enum: ['APPROVED', 'REJECTED'], required: true },
    comments: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });
const revisionSchema = new mongoose_1.Schema({
    revisionNumber: { type: Number, required: true },
    revisedAt: { type: Date, default: Date.now },
    revisedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    revisedByName: { type: String, required: true },
    reason: { type: String, required: true, trim: true },
    snapshot: { type: mongoose_1.Schema.Types.Mixed, required: true },
}, { _id: false });
const purchaseOrderSchema = new mongoose_1.Schema({
    poNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    poDate: { type: Date, default: Date.now },
    rfqId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'RFQ', default: null },
    supplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', required: true },
    supplierContactPerson: { type: String, trim: true },
    supplierAddress: { type: String, trim: true },
    buyerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, default: 'Purchasing', trim: true },
    currency: { type: String, default: 'ETB', uppercase: true },
    paymentTerms: { type: String, default: 'NET_30' },
    deliveryTerms: { type: String, default: 'EXW' },
    expectedDeliveryDate: { type: Date },
    warehouse: { type: String, default: 'Main Warehouse', trim: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    termsAndConditions: {
        type: String,
        default: '1. Goods must be delivered in accordance with agreed specifications.\n2. Payment terms as stated in this order.\n3. The company reserves the right to reject defective items.',
    },
    lines: [poLineSchema],
    subtotal: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(types_1.POStatus), default: types_1.POStatus.DRAFT },
    approvalStage: { type: String, default: 'DRAFT' },
    approvalHistory: [approvalStepSchema],
    sentToVendorAt: { type: Date },
    revisionNumber: { type: Number, default: 0 },
    revisions: [revisionSchema],
}, { timestamps: true });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ buyerId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ poDate: -1 });
exports.PurchaseOrder = mongoose_1.default.model('PurchaseOrder', purchaseOrderSchema);
//# sourceMappingURL=PurchaseOrder.js.map