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
exports.Rotation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const rotationGuardSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    order: { type: Number, default: 0 },
}, { _id: false });
const rotationFloaterSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { _id: false });
const leaveCoverageSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    coverGuardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    path: { type: String, enum: ['POOL', 'FLOATER'], required: true },
    appliedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    appliedAt: { type: Date, default: Date.now },
}, { _id: false });
const shiftDefinitionSchema = new mongoose_1.Schema({
    key: { type: String, required: true },
    name: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    requiredCount: { type: Number, required: true, min: 0 },
}, { _id: false });
const restRuleSchema = new mongoose_1.Schema({
    maxShiftHours: { type: Number, required: true, min: 1 },
    minRestHours: { type: Number, required: true, min: 0 },
}, { _id: false });
const changeLogSchema = new mongoose_1.Schema({
    at: { type: Date, default: Date.now },
    by: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    details: { type: String },
}, { _id: false });
const ROTATION_STATUSES = [
    'DRAFT', 'GENERATING', 'GENERATED', 'REVIEW', 'APPROVED',
    'PUBLISHED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ARCHIVED',
];
const rotationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [rotationGuardSchema],
    floaterPool: [rotationFloaterSchema],
    shiftMode: { type: String, enum: ['STANDARD_12H', 'SINGLE_24H', 'CUSTOM'], default: 'STANDARD_12H' },
    shiftDefinitions: { type: [shiftDefinitionSchema], default: [] },
    // Legacy fields kept for backward compatibility. Counts may be 0 (e.g. 24-hour
    // single-shift mode has nightShiftCount = 0). New rotations persist explicit
    // shiftDefinitions; resolveShifts() synthesizes definitions for old documents.
    dayShiftCount: { type: Number, required: true, min: 0, default: 1 },
    nightShiftCount: { type: Number, min: 0, default: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    dayEndTime: { type: String, default: '18:00' },
    nightStartTime: { type: String, default: '18:00' },
    // NOTE: legacy documents stored the night START under this name ('18:00').
    // New documents store the real night end ('06:00'). resolveShifts() detects
    // legacy documents by the absence of nightStartTime and handles both.
    nightEndTime: { type: String, default: '06:00' },
    restRules: {
        type: [restRuleSchema],
        default: () => [
            { maxShiftHours: 12, minRestHours: 24 },
            { maxShiftHours: 24, minRestHours: 48 },
        ],
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ROTATION_STATUSES, default: 'DRAFT' },
    lastGeneratedDate: { type: Date },
    generation: {
        type: new mongoose_1.Schema({
            generatedAt: Date,
            generatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
            days: Number,
            algorithmVersion: String,
            rulesFingerprint: String,
            conflictCount: Number,
            feasibility: { type: String, enum: ['FULLY_COMPLIANT', 'BEST_POSSIBLE'] },
            stale: { type: Boolean, default: false },
            stats: mongoose_1.Schema.Types.Mixed,
            conflicts: mongoose_1.Schema.Types.Mixed,
        }, { _id: false }),
        default: undefined,
    },
    changeLog: { type: [changeLogSchema], default: [] },
    leaveCoverages: [leaveCoverageSchema],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
rotationSchema.index({ name: 1 });
rotationSchema.index({ status: 1 });
rotationSchema.index({ siteId: 1 });
exports.Rotation = mongoose_1.default.model('Rotation', rotationSchema);
//# sourceMappingURL=Rotation.js.map