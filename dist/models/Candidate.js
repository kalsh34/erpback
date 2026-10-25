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
exports.Candidate = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const candidateSchema = new mongoose_1.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    position: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    stage: {
        type: String,
        enum: ['APPLICATION', 'SCREENING', 'INTERVIEW', 'EXAM', 'OFFER', 'HIRED', 'REJECTED'],
        default: 'APPLICATION',
    },
    rejectionReason: { type: String, trim: true },
    appliedDate: { type: Date, default: Date.now },
    stageHistory: [
        {
            stage: { type: String, required: true },
            date: { type: Date, required: true },
            notes: { type: String, trim: true },
        },
    ],
    notes: { type: String, trim: true },
}, { timestamps: true });
candidateSchema.index({ stage: 1 });
candidateSchema.index({ position: 1 });
candidateSchema.index({ department: 1 });
exports.Candidate = mongoose_1.default.model('Candidate', candidateSchema);
//# sourceMappingURL=Candidate.js.map