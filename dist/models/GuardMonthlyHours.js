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
exports.GuardMonthlyHours = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const guardMonthlyHoursSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    normalHours: {
        type: Number,
        default: 0,
        min: [0, 'Hours cannot be negative'],
        validate: {
            validator: (v) => Math.round(v * 100) / 100 === v,
            message: 'Hours support at most 2 decimal places',
        },
    },
    holidayHours: {
        type: Number,
        default: 0,
        min: [0, 'Hours cannot be negative'],
        validate: {
            validator: (v) => Math.round(v * 100) / 100 === v,
            message: 'Hours support at most 2 decimal places',
        },
    },
    sundayHours: {
        type: Number,
        default: 0,
        min: [0, 'Hours cannot be negative'],
        validate: {
            validator: (v) => Math.round(v * 100) / 100 === v,
            message: 'Hours support at most 2 decimal places',
        },
    },
    notes: { type: String, trim: true },
    source: { type: String, default: 'HR_MANUAL' },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [{
            previous: {
                normalHours: { type: Number, default: 0 },
                holidayHours: { type: Number, default: 0 },
                sundayHours: { type: Number, default: 0 },
            },
            new: {
                normalHours: { type: Number, required: true },
                holidayHours: { type: Number, required: true },
                sundayHours: { type: Number, required: true },
            },
            reason: { type: String, trim: true },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            changedAt: { type: Date, default: Date.now },
        }],
}, { timestamps: true });
// One monthly sheet per guard + site + month.
guardMonthlyHoursSchema.index({ guardId: 1, siteId: 1, periodKey: 1 }, { unique: true });
guardMonthlyHoursSchema.index({ periodKey: 1, siteId: 1 });
exports.GuardMonthlyHours = mongoose_1.default.model('GuardMonthlyHours', guardMonthlyHoursSchema);
//# sourceMappingURL=GuardMonthlyHours.js.map