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
exports.Party = exports.PartyType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var PartyType;
(function (PartyType) {
    PartyType["EMPLOYEE"] = "EMPLOYEE";
    PartyType["CUSTOMER"] = "CUSTOMER";
    PartyType["VENDOR"] = "VENDOR";
    PartyType["CONTACT"] = "CONTACT";
})(PartyType || (exports.PartyType = PartyType = {}));
const partySchema = new mongoose_1.Schema({
    partyType: { type: String, enum: Object.values(PartyType), required: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
partySchema.virtual('fullName').get(function () {
    return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});
partySchema.set('toJSON', { virtuals: true });
partySchema.index({ partyType: 1 });
partySchema.index({ email: 1 });
partySchema.index({ lastName: 1, firstName: 1 });
partySchema.index({ tags: 1 });
exports.Party = mongoose_1.default.model('Party', partySchema);
//# sourceMappingURL=Party.js.map