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
exports.ServiceRole = exports.ShiftPattern = exports.RateType = exports.RoleCategory = exports.RoleGender = void 0;
exports.describeShiftPattern = describeShiftPattern;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
/**
 * SERVICE ROLE (Proforma module — service / guard role registration).
 *
 * The master catalog every proforma line must come from. A role carries its
 * default monthly rate, the headcount MULTIPLIER used for the automatic
 * "total headcount = posts per day × multiplier" calculation, the shift
 * pattern / rest-days rule, and the two commercial switches:
 *   - vatApplicable      → whether the role's value is subject to the 15% VAT
 *   - allowRateOverride  → whether a proforma may quote a rate other than the
 *                          default (otherwise the default is mandatory).
 *
 * Inactive roles keep their code (history + issued proformas) but disappear
 * from the proforma pickers.
 */
var RoleGender;
(function (RoleGender) {
    RoleGender["MALE"] = "MALE";
    RoleGender["FEMALE"] = "FEMALE";
    RoleGender["UNISEX"] = "UNISEX";
    RoleGender["NA"] = "NA";
})(RoleGender || (exports.RoleGender = RoleGender = {}));
var RoleCategory;
(function (RoleCategory) {
    RoleCategory["MANPOWER"] = "MANPOWER";
    RoleCategory["K9"] = "K9";
    RoleCategory["ELECTRONIC"] = "ELECTRONIC";
    RoleCategory["OTHER"] = "OTHER";
})(RoleCategory || (exports.RoleCategory = RoleCategory = {}));
var RateType;
(function (RateType) {
    RateType["MONTHLY"] = "MONTHLY";
    RateType["DAILY"] = "DAILY";
})(RateType || (exports.RateType = RateType = {}));
var ShiftPattern;
(function (ShiftPattern) {
    ShiftPattern["CONTINUOUS_24_48"] = "CONTINUOUS_24_48";
    ShiftPattern["DAY_SHIFT"] = "DAY_SHIFT";
    ShiftPattern["CUSTOM"] = "CUSTOM";
})(ShiftPattern || (exports.ShiftPattern = ShiftPattern = {}));
/** Human wording of a shift pattern, used in auto-generated proforma notes. */
function describeShiftPattern(pattern) {
    switch (pattern) {
        case ShiftPattern.CONTINUOUS_24_48:
            return '24 hours on duty / 48 hours rest (continuous 24/48 shift)';
        case ShiftPattern.DAY_SHIFT:
            return 'day shift (12 hours per day)';
        default:
            return 'custom shift pattern';
    }
}
const serviceRoleSchema = new mongoose_1.Schema({
    roleCode: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        match: [/^[A-Z0-9][A-Z0-9._/-]{0,31}$/, 'Role code must be 1-32 chars of A-Z, 0-9 and . _ / -'],
    },
    roleName: { type: String, required: true, trim: true },
    gender: { type: String, enum: Object.values(RoleGender), default: RoleGender.UNISEX },
    category: { type: String, enum: Object.values(RoleCategory), default: RoleCategory.MANPOWER },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    defaultMonthlyRate: { type: Number, required: true, min: 0 },
    rateType: { type: String, enum: Object.values(RateType), default: RateType.MONTHLY },
    vatApplicable: { type: Boolean, default: true },
    allowRateOverride: { type: Boolean, default: false },
    shiftPattern: { type: String, enum: Object.values(ShiftPattern), required: true, default: ShiftPattern.CONTINUOUS_24_48 },
    multiplier: { type: Number, required: true, min: 0, default: 3 },
    restDaysRule: { type: String, default: '', trim: true },
    status: { type: String, enum: Object.values(types_1.CompanyStatus), default: types_1.CompanyStatus.ACTIVE },
}, { timestamps: true });
serviceRoleSchema.index({ roleCode: 1 }, { unique: true });
serviceRoleSchema.index({ status: 1 });
serviceRoleSchema.index({ roleName: 1 });
exports.ServiceRole = mongoose_1.default.model('ServiceRole', serviceRoleSchema);
//# sourceMappingURL=ServiceRole.js.map