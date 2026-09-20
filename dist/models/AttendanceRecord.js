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
exports.AttendanceRecord = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const attendanceRecordSchema = new mongoose_1.Schema({
    guardId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    isHoliday: { type: Boolean, default: false },
    source: { type: String, enum: Object.values(types_1.AttendanceSource), default: types_1.AttendanceSource.SYSTEM },
    filedById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    filedAt: { type: Date },
    notes: { type: String },
    editedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    editReason: { type: String },
    declaredRelieverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', default: null },
    declaredRelieverSiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', default: null },
    overrideBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    overrideReason: { type: String },
}, { timestamps: true });
attendanceRecordSchema.index({ guardId: 1, siteId: 1, date: 1 }, { unique: true });
attendanceRecordSchema.index({ siteId: 1, date: 1 });
attendanceRecordSchema.index({ siteId: 1, clockOut: 1 });
attendanceRecordSchema.index({ source: 1 });
exports.AttendanceRecord = mongoose_1.default.model('AttendanceRecord', attendanceRecordSchema);
//# sourceMappingURL=AttendanceRecord.js.map