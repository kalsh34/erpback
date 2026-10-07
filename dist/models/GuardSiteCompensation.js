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
exports.GuardSiteCompensation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const guardSiteCompensationSchema = new mongoose_1.Schema({
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    compensationAmount: {
        type: Number,
        required: true,
        min: [0, 'Compensation cannot be negative'],
        validate: {
            validator: (v) => Math.round(v * 100) / 100 === v,
            message: 'Compensation supports at most 2 decimal places',
        },
    },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isCurrent: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
guardSiteCompensationSchema.index({ siteId: 1, effectiveFrom: -1 });
guardSiteCompensationSchema.index({ siteId: 1, isCurrent: 1 });
exports.GuardSiteCompensation = mongoose_1.default.model('GuardSiteCompensation', guardSiteCompensationSchema);
//# sourceMappingURL=GuardSiteCompensation.js.map