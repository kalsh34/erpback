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
exports.Site = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const siteSchema = new mongoose_1.Schema({
    siteName: { type: String, required: true, trim: true },
    siteCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', default: null },
    client: { type: String, trim: true },
    location: { type: String, required: true, trim: true },
    siteType: { type: String, enum: Object.values(types_1.SiteType), required: true },
    status: { type: String, enum: Object.values(types_1.SiteStatus), default: types_1.SiteStatus.ACTIVE },
    latitude: { type: Number },
    longitude: { type: Number },
    radiusMeters: { type: Number, default: 100 },
    agreedManpower: { type: Number, required: true },
    actualManpower: { type: Number, required: true },
    contactPerson: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
}, { timestamps: true });
siteSchema.index({ siteCode: 1 });
siteSchema.index({ status: 1 });
exports.Site = mongoose_1.default.model('Site', siteSchema);
//# sourceMappingURL=Site.js.map