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
exports.GuardAttendanceRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const guardAttendanceSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    dayOfMonth: { type: Number, required: true },
    hoursWorked: { type: Number, required: true, min: 0.01 },
    isHoliday: { type: Boolean, default: false },
    periodKey: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    status: { type: String, enum: Object.values(types_1.GuardAttendanceStatus), default: types_1.GuardAttendanceStatus.ACTIVE },
    source: { type: String, enum: Object.values(types_1.AttendanceSource), default: types_1.AttendanceSource.OPERATIONS_EDIT },
    notes: { type: String, trim: true },
    recordedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    changeHistory: [{
            previousHours: { type: Number, default: null },
            newHours: { type: Number, required: true },
            reason: { type: String, trim: true },
            changedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            changedAt: { type: Date, default: Date.now },
        }],
    voidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    voidedAt: { type: Date },
    voidReason: { type: String, trim: true },
}, { timestamps: true });
// Hard rule: one ACTIVE row per guard + site + date. VOID rows stay for audit.
guardAttendanceSchema.index({ guardId: 1, siteId: 1, date: 1 }, { unique: true, partialFilterExpression: { status: types_1.GuardAttendanceStatus.ACTIVE } });
guardAttendanceSchema.index({ periodKey: 1, guardId: 1 });
guardAttendanceSchema.index({ siteId: 1, date: 1 });
guardAttendanceSchema.index({ guardId: 1, date: 1 });
exports.GuardAttendanceRecord = mongoose_1.default.model('GuardAttendanceRecord', guardAttendanceSchema);
//# sourceMappingURL=GuardAttendanceRecord.js.map