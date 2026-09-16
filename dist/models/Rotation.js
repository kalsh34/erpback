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
const rotationSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    guardPool: [rotationGuardSchema],
    floaterPool: [rotationFloaterSchema],
    dayShiftCount: { type: Number, required: true, min: 1 },
    nightShiftCount: { type: Number, required: true, min: 1 },
    dayStartTime: { type: String, required: true, default: '06:00' },
    nightEndTime: { type: String, required: true, default: '18:00' },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'], default: 'DRAFT' },
    lastGeneratedDate: { type: Date },
    leaveCoverages: [leaveCoverageSchema],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
rotationSchema.index({ name: 1 });
rotationSchema.index({ status: 1 });
rotationSchema.index({ siteId: 1 });
exports.Rotation = mongoose_1.default.model('Rotation', rotationSchema);
//# sourceMappingURL=Rotation.js.map