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
exports.ProformaSite = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const proformaSiteSchema = new mongoose_1.Schema({
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ProformaCompany', required: true },
    siteName: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    region: { type: String, default: '', trim: true },
    specialRequirements: { type: String, default: '', trim: true, maxlength: 2000 },
    status: { type: String, enum: Object.values(types_1.CompanyStatus), default: types_1.CompanyStatus.ACTIVE },
}, { timestamps: true });
proformaSiteSchema.index({ companyId: 1, siteName: 1 });
proformaSiteSchema.index({ status: 1 });
exports.ProformaSite = mongoose_1.default.model('ProformaSite', proformaSiteSchema);
//# sourceMappingURL=ProformaSite.js.map