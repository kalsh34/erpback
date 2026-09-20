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
exports.ShiftSchedule = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const poolGuardSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    order: { type: Number, default: 0 },
}, { _id: false });
const shiftScheduleSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [poolGuardSchema],
    floaterPool: [poolGuardSchema],
    shiftMode: { type: String, enum: ['STANDARD_12H', 'SINGLE_24H'], default: 'STANDARD_12H' },
    dayCount: { type: Number, required: true, min: 0, default: 1 },
    nightCount: { type: Number, required: true, min: 0, default: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    dayEndTime: { type: String, required: true, default: '18:00' },
    nightStartTime: { type: String, required: true, default: '18:00' },
    nightEndTime: { type: String, required: true, default: '06:00' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    lastGeneratedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
shiftScheduleSchema.index({ siteId: 1 });
shiftScheduleSchema.index({ status: 1 });
shiftScheduleSchema.index({ 'guardPool.guardId': 1 });
exports.ShiftSchedule = mongoose_1.default.model('ShiftSchedule', shiftScheduleSchema);
//# sourceMappingURL=ShiftSchedule.js.map