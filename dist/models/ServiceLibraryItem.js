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
exports.ServiceLibraryItem = exports.PricingModel = exports.ServiceCategory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * Reusable marketing service library (Proposal & Proforma module — Phase A).
 *
 * A entry describes ONE re-usable service the company sells (guard service,
 * CCTV, alarm, QR patrol, access control, custom package). Proformas built in a
 * later phase will COPY the description/detail/price values out of these
 * entries as a snapshot, so later edits here never rewrite old quotes.
 *
 * Pricing is intentionally NOT one identical structure for every category:
 *  - guard services quote "monthly salary BEFORE VAT per one guard" with
 *    male/female staffing and the 24h-on/48h-off shift note (see the Tiga
 *    Hotel and Garment Residence reference proformas);
 *  - equipment services quote per-item quantities/installation details.
 * Both shapes are expressed with the flexible `structuredDetails` key/value
 * blocks plus a `pricingModel` hint, so no category is forced into another's
 * schema. VAT is deliberately out of scope in Phase A (15% is only a proposed
 * default for the future proforma phase).
 */
var ServiceCategory;
(function (ServiceCategory) {
    ServiceCategory["GUARD_SERVICE"] = "GUARD_SERVICE";
    ServiceCategory["CCTV"] = "CCTV";
    ServiceCategory["ALARM"] = "ALARM";
    ServiceCategory["QR_PATROL"] = "QR_PATROL";
    ServiceCategory["ACCESS_CONTROL"] = "ACCESS_CONTROL";
    ServiceCategory["CUSTOM"] = "CUSTOM";
})(ServiceCategory || (exports.ServiceCategory = ServiceCategory = {}));
var PricingModel;
(function (PricingModel) {
    PricingModel["MONTHLY_PER_GUARD"] = "MONTHLY_PER_GUARD";
    PricingModel["PER_DAY"] = "PER_DAY";
    PricingModel["PER_UNIT"] = "PER_UNIT";
    PricingModel["PER_INSTALLATION"] = "PER_INSTALLATION";
    PricingModel["CUSTOM"] = "CUSTOM";
})(PricingModel || (exports.PricingModel = PricingModel = {}));
const detailEntrySchema = new mongoose_1.Schema({
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
}, { _id: false });
const equipmentItemSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, default: 'PCS' },
    notes: { type: String, trim: true },
}, { _id: false });
const serviceLibraryItemSchema = new mongoose_1.Schema({
    // NOTE: uniqueness is enforced by the PARTIAL unique index below (active docs
    // only), not by field-level `unique: true` — an inactive entry keeps its code.
    code: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        match: [/^[A-Z0-9][A-Z0-9._/-]{1,63}$/, 'Service code must be 2-64 chars of A-Z, 0-9 and . _ / -'],
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: Object.values(ServiceCategory), required: true },
    unit: { type: String, required: true, trim: true, default: 'MONTH', uppercase: true },
    pricingModel: { type: String, enum: Object.values(PricingModel), default: PricingModel.CUSTOM },
    defaultUnitPrice: { type: Number, default: null, min: 0 },
    currency: { type: String, default: 'ETB', uppercase: true },
    structuredDetails: { type: [detailEntrySchema], default: [] },
    maleGuardsPerDay: { type: Number, default: null, min: 0 },
    femaleGuardsPerDay: { type: Number, default: null, min: 0 },
    maleGuardsPerMonth: { type: Number, default: null, min: 0 },
    femaleGuardsPerMonth: { type: Number, default: null, min: 0 },
    monthlySalaryBeforeVatMale: { type: Number, default: null, min: 0 },
    monthlySalaryBeforeVatFemale: { type: Number, default: null, min: 0 },
    shiftNote: { type: String, default: '' },
    equipmentItems: { type: [equipmentItemSchema], default: [] },
    installationNote: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
serviceLibraryItemSchema.index({ category: 1 });
serviceLibraryItemSchema.index({ isActive: 1 });
serviceLibraryItemSchema.index({ name: 1 });
// Only one active entry per business code is a write-path rule, but the stale
// inactive doc keeps history: partial unique index on active documents only.
serviceLibraryItemSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
exports.ServiceLibraryItem = mongoose_1.default.model('ServiceLibraryItem', serviceLibraryItemSchema);
//# sourceMappingURL=ServiceLibraryItem.js.map