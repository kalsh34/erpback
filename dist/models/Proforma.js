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
exports.Proforma = exports.PROFORMA_DEFAULT_VALIDITY_DAYS = exports.PROFORMA_VAT_RATE = exports.PROFORMA_TRANSITIONS = exports.ProformaStatus = void 0;
exports.round2 = round2;
exports.computeItemValues = computeItemValues;
exports.computeProformaTotals = computeProformaTotals;
exports.addDays = addDays;
const mongoose_1 = __importStar(require("mongoose"));
const ServiceRole_1 = require("./ServiceRole");
/**
 * PROFORMA DOCUMENT (Proforma module).
 *
 * Business rules enforced by ProformaService, mirrored by the schema below:
 *  1. Only an ACTIVE registered company can be quoted.
 *  2. Every line must reference an ACTIVE entry of the ServiceRole catalog.
 *  3. Headcount is computed by the system: posts/day × role multiplier. The
 *     client never supplies totalHeadcount or lineTotal — those values are
 *     recomputed server-side on every create/update.
 *  4. Once status is no longer DRAFT most fields are read-only (only the
 *     lifecycle endpoints may move it forward).
 *  5. Validity defaults to 15 days and is editable.
 *  6. VAT is 15% (PROFORMA_VAT_RATE) and applies only to lines whose role is
 *     VAT-applicable.
 *  7. The proforma number 'PF/VGT/<YEAR>/<NNNN>' is allocated atomically from
 *     ProformaSequence and never reused.
 */
var ProformaStatus;
(function (ProformaStatus) {
    ProformaStatus["DRAFT"] = "DRAFT";
    ProformaStatus["ISSUED"] = "ISSUED";
    ProformaStatus["ACCEPTED"] = "ACCEPTED";
    ProformaStatus["EXPIRED"] = "EXPIRED";
    ProformaStatus["CONVERTED"] = "CONVERTED";
    ProformaStatus["CANCELLED"] = "CANCELLED";
})(ProformaStatus || (exports.ProformaStatus = ProformaStatus = {}));
/** Statuses a proforma may move to from its current status. */
exports.PROFORMA_TRANSITIONS = {
    [ProformaStatus.DRAFT]: [ProformaStatus.ISSUED, ProformaStatus.CANCELLED],
    [ProformaStatus.ISSUED]: [
        ProformaStatus.ACCEPTED,
        ProformaStatus.EXPIRED,
        ProformaStatus.CONVERTED,
        ProformaStatus.CANCELLED,
    ],
    [ProformaStatus.ACCEPTED]: [ProformaStatus.CONVERTED, ProformaStatus.CANCELLED],
    [ProformaStatus.EXPIRED]: [ProformaStatus.CONVERTED, ProformaStatus.CANCELLED],
    [ProformaStatus.CONVERTED]: [],
    [ProformaStatus.CANCELLED]: [],
};
/** Fixed VAT rate for the module (rule 6). */
exports.PROFORMA_VAT_RATE = 0.15;
/** Default quote validity in days (rule 5). */
exports.PROFORMA_DEFAULT_VALIDITY_DAYS = 15;
/** Round money to 2 decimals, half-up (business rounding). */
function round2(n) {
    if (!Number.isFinite(n))
        return 0;
    if (Number.isInteger(n))
        return n;
    const r = Number(`${Math.round(Number(`${n}e2`))}e-2`);
    return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
}
/** Headcount + line value for one quoted role (rule 3). */
function computeItemValues(postsPerDay, multiplier, unitRate) {
    const totalHeadcount = round2(postsPerDay * multiplier);
    const lineTotal = round2(totalHeadcount * unitRate);
    return { totalHeadcount, lineTotal };
}
/**
 * Document totals. VAT is charged on the VAT-applicable lines only (rule 6);
 * subtotal and grandTotal are cent-rounded.
 */
function computeProformaTotals(items, vatRate = exports.PROFORMA_VAT_RATE) {
    const subtotal = round2(items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0));
    const vatBase = round2(items.reduce((s, i) => s + (i.vatApplicable ? Number(i.lineTotal) || 0 : 0), 0));
    const vatAmount = round2(vatBase * vatRate);
    const grandTotal = round2(subtotal + vatAmount);
    return { subtotal, vatAmount, grandTotal };
}
/** Add calendar days to a date (local midnight, DST-safe). */
function addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
}
const itemSchema = new mongoose_1.Schema({
    roleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ServiceRole', required: true },
    roleCode: { type: String, required: true, trim: true },
    roleName: { type: String, required: true, trim: true },
    gender: { type: String, enum: Object.values(ServiceRole_1.RoleGender), required: true },
    category: { type: String, enum: Object.values(ServiceRole_1.RoleCategory), default: ServiceRole_1.RoleCategory.MANPOWER },
    postsPerDay: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 0 },
    totalHeadcount: { type: Number, required: true, min: 0 },
    unitRate: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    vatApplicable: { type: Boolean, required: true, default: true },
    shiftPattern: { type: String, enum: Object.values(ServiceRole_1.ShiftPattern), required: true },
    restDaysRule: { type: String, default: '', trim: true },
}, { _id: false });
const proformaSchema = new mongoose_1.Schema({
    number: { type: String, required: true, trim: true, match: /^PF\/VGT\/\d{4}\/\d{4,}$/ },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ProformaCompany', required: true },
    siteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ProformaSite', required: true },
    issueDate: { type: Date, required: true },
    validityDays: { type: Number, required: true, min: 1, max: 365, default: exports.PROFORMA_DEFAULT_VALIDITY_DAYS },
    validityDate: { type: Date, required: true },
    status: { type: String, enum: Object.values(ProformaStatus), required: true, default: ProformaStatus.DRAFT },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    shiftNote: { type: String, default: '', trim: true, maxlength: 4000 },
    notes: { type: String, default: '', trim: true, maxlength: 4000 },
    internalNotes: { type: String, default: '', trim: true, maxlength: 4000 },
    deliveryEmailPdf: { type: Boolean, default: false },
    deliveryHardCopy: { type: Boolean, default: false },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    issuedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
}, { timestamps: true });
proformaSchema.index({ number: 1 }, { unique: true });
proformaSchema.index({ companyId: 1, issueDate: -1 });
proformaSchema.index({ status: 1 });
proformaSchema.index({ validityDate: 1 });
exports.Proforma = mongoose_1.default.model('Proforma', proformaSchema);
//# sourceMappingURL=Proforma.js.map