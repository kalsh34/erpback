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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const productSchema = new mongoose_1.Schema({
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(types_1.ProductType), default: types_1.ProductType.STOCKABLE },
    category: { type: String, required: true, trim: true, default: 'General' },
    uom: { type: String, required: true, trim: true, default: 'PCS' },
    salesPrice: { type: Number, default: 0, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 15, min: 0 }, // Standard 15% VAT default
    barcode: { type: String, trim: true },
    description: { type: String, trim: true },
    defaultSupplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Contact', default: null },
    supplierProductCode: { type: String, trim: true },
    supplierPrice: { type: Number, default: 0, min: 0 },
    supplierCurrency: { type: String, default: 'ETB', uppercase: true },
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    leadTimeDays: { type: Number, default: 3, min: 0 },
    purchaseUom: { type: String, trim: true, default: 'PCS' },
    supplierDescription: { type: String, trim: true },
    currentStock: { type: Number, default: 0 },
    incomingStock: { type: Number, default: 0 },
    reorderLevel: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ defaultSupplierId: 1 });
productSchema.index({ isActive: 1 });
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=Product.js.map