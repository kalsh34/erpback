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
exports.Contact = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const contactPersonSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
}, { _id: false });
const bankInfoSchema = new mongoose_1.Schema({
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    branch: { type: String, trim: true },
    iban: { type: String, trim: true },
}, { _id: false });
const contactSchema = new mongoose_1.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    contactType: { type: String, enum: Object.values(types_1.ContactType), default: types_1.ContactType.COMPANY },
    isSupplier: { type: Boolean, default: true },
    isCustomer: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Ethiopia' },
    zipCode: { type: String, trim: true },
    tin: { type: String, trim: true },
    paymentTerms: { type: String, default: 'NET_30' },
    currency: { type: String, default: 'ETB', uppercase: true },
    bankInfo: { type: bankInfoSchema, default: {} },
    contactPersons: [contactPersonSchema],
    supplierCategory: { type: String, trim: true, default: 'DISTRIBUTOR' },
    deliveryTerms: { type: String, trim: true, default: 'EXW' },
    supplierRating: { type: Number, default: 5, min: 1, max: 5 },
    preferredProductIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    totalPurchaseSpend: { type: Number, default: 0 },
    totalOrdersCount: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
contactSchema.index({ name: 1 });
contactSchema.index({ isSupplier: 1 });
contactSchema.index({ isCustomer: 1 });
contactSchema.index({ isActive: 1 });
exports.Contact = mongoose_1.default.model('Contact', contactSchema);
//# sourceMappingURL=Contact.js.map