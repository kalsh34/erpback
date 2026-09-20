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
exports.ShiftAssignment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const shiftAssignmentSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    shiftTemplateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    source: { type: String, enum: Object.values(types_1.ShiftAssignmentSource), default: types_1.ShiftAssignmentSource.MANUAL },
    rotationId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Rotation', default: null },
    assignedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
shiftAssignmentSchema.index({ guardId: 1, status: 1 });
shiftAssignmentSchema.index({ siteId: 1, status: 1 });
shiftAssignmentSchema.index({ startDate: 1, endDate: 1 });
shiftAssignmentSchema.index({ source: 1 });
shiftAssignmentSchema.index({ rotationId: 1 }, { sparse: true });
shiftAssignmentSchema.index({ guardId: 1, status: 1, startDate: 1, endDate: 1 });
exports.ShiftAssignment = mongoose_1.default.model('ShiftAssignment', shiftAssignmentSchema);
//# sourceMappingURL=ShiftAssignment.js.map