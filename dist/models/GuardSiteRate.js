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
exports.GuardSiteRate = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const guardSiteRateSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    payrollPeriodId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'PayrollPeriod', required: true },
    normalRate: { type: Number, required: true, min: 0 },
    holidayRate: { type: Number, required: true, min: 0 },
    setBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
// One rate per guard+site+period — no overlapping rates possible.
guardSiteRateSchema.index({ guardId: 1, siteId: 1, payrollPeriodId: 1 }, { unique: true });
guardSiteRateSchema.index({ payrollPeriodId: 1 });
exports.GuardSiteRate = mongoose_1.default.model('GuardSiteRate', guardSiteRateSchema);
//# sourceMappingURL=GuardSiteRate.js.map