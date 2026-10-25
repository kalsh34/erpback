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
exports.Guarantor = exports.GuarantorVerificationStatus = exports.GuarantorType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var GuarantorType;
(function (GuarantorType) {
    GuarantorType["PERSON"] = "PERSON";
    GuarantorType["VEHICLE_COLLATERAL"] = "VEHICLE_COLLATERAL";
    GuarantorType["PROPERTY_COLLATERAL"] = "PROPERTY_COLLATERAL";
})(GuarantorType || (exports.GuarantorType = GuarantorType = {}));
var GuarantorVerificationStatus;
(function (GuarantorVerificationStatus) {
    GuarantorVerificationStatus["PENDING"] = "PENDING";
    GuarantorVerificationStatus["VERIFIED"] = "VERIFIED";
    GuarantorVerificationStatus["REJECTED"] = "REJECTED";
})(GuarantorVerificationStatus || (exports.GuarantorVerificationStatus = GuarantorVerificationStatus = {}));
const guarantorSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    guarantorType: { type: String, enum: Object.values(GuarantorType), required: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    relationship: { type: String, trim: true },
    occupation: { type: String, trim: true },
    idNumber: { type: String, trim: true },
    vehicleType: { type: String, trim: true },
    vehiclePlateNumber: { type: String, trim: true },
    vehicleMake: { type: String, trim: true },
    vehicleYear: { type: Number },
    propertyType: { type: String, trim: true },
    propertyLocation: { type: String, trim: true },
    propertyTitleNumber: { type: String, trim: true },
    estimatedValue: { type: Number },
    documents: [{
            url: { type: String, required: true },
            fileName: { type: String, required: true },
            description: { type: String },
        }],
    verificationStatus: { type: String, enum: Object.values(GuarantorVerificationStatus), default: GuarantorVerificationStatus.PENDING },
    verifiedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String },
    notes: { type: String, trim: true },
}, { timestamps: true });
guarantorSchema.index({ employeeId: 1 });
guarantorSchema.index({ verificationStatus: 1 });
exports.Guarantor = mongoose_1.default.model('Guarantor', guarantorSchema);
//# sourceMappingURL=Guarantor.js.map