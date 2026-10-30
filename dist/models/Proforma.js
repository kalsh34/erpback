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
exports.Proforma = exports.PROFORMA_MAX_VAT_RATE = exports.PROFORMA_DEFAULT_VAT_RATE = exports.ALLOWED_TRANSITIONS = exports.LIVE_STATUSES = exports.ProformaStatus = void 0;
exports.round2 = round2;
exports.mulExact = mulExact;
const mongoose_1 = __importStar(require("mongoose"));
const ServiceLibraryItem_1 = require("./ServiceLibraryItem");
/**
 * PROFORMA (Marketing — Proposal & Proforma Management, Phase C backend).
 *
 * A proforma is a quotation document quoting one or more services from the
 * Phase A service library. Design rules:
 *
 *  - Every LINE stores an IMMUTABLE SNAPSHOT of the library entry's commercial
 *    details at the moment the line was written. Later edits/deactivations in
 *    the library never rewrite a proforma's quoted value. Drafts may be edited
 *    freely (snapshots are re-resolved while still a draft); once ISSUED the
 *    document is frozen.
 *  - Money is computed SERVER-SIDE from quantity × unitPrice −
 *    discountAmount. Totals sent by the client are never trusted.
 *  - VAT is configurable per proforma (vatRate as a fraction, 0–1).
 *    VAT_DEFAULT_RATE below is a PROPOSED default (15%), not a universal
 *    business rule; unit prices and discount amounts are always VAT-EXCLUSIVE
 *    and grandTotal is the only VAT-INCLUSIVE figure.
 *  - LIFELDIFE (safe transitions only):
 *      DRAFT      → ISSUED       (explicit issue action freezes the document)
 *      DRAFT      → VOID         (draft withdrawn before offering)
 *      ISSUED     → SUPERSEDED   (automatic — set when an amendment of this
 *                                  proforma is issued; never directly settable)
 *    Amendments NEVER modify an issued document: POST /:id/amend creates a
 *    fresh DRAFT revision (revisionNumber = parent + 1) that carries the
 *    parent's lines/snapshots; issuing that revision supersedes the parent.
 *
 *  - Numbering 'PRO-<YYYY>-####' comes from ProformaSequence, an atomic
 *    findOneAndUpdate/$inc counter (same pattern as guard employee codes) so
 *    concurrent creation can never produce duplicate numbers.
 */
var ProformaStatus;
(function (ProformaStatus) {
    ProformaStatus["DRAFT"] = "DRAFT";
    ProformaStatus["ISSUED"] = "ISSUED";
    ProformaStatus["SUPERSEDED"] = "SUPERSEDED";
    ProformaStatus["VOID"] = "VOID";
})(ProformaStatus || (exports.ProformaStatus = ProformaStatus = {}));
/** Live statuses that use a proforma number and participate in amendments. */
exports.LIVE_STATUSES = [ProformaStatus.DRAFT, ProformaStatus.ISSUED];
/** Statuses a proforma may transition to, from its current status. */
exports.ALLOWED_TRANSITIONS = {
    [ProformaStatus.DRAFT]: [ProformaStatus.ISSUED, ProformaStatus.VOID],
    [ProformaStatus.ISSUED]: [ProformaStatus.SUPERSEDED],
    [ProformaStatus.SUPERSEDED]: [],
    [ProformaStatus.VOID]: [],
};
/** PROPOSED default — 15% VAT as a fraction. Vault: configurable per proforma. */
exports.PROFORMA_DEFAULT_VAT_RATE = 0.15;
/** Maximum VAT rate accepted (a fraction, so 1.0 = 100%). */
exports.PROFORMA_MAX_VAT_RATE = 1;
/**
 * Round money to 2 decimals, rounding decimal halves UP (business rounding).
 * Uses the exponent-string trick so 1150.005 → 1150.01 despite the float
 * product 1150.00500000000... having a low-order binary error; values already
 * in e-notation (never produced by money math here) fall back to plain Math.round.
 */
function round2(n) {
    if (Number.isInteger(n))
        return n;
    if (String(n).includes('e') || String(n).includes('E'))
        return Math.round(n * 100) / 100;
    const r = Number(Math.round(Number(`${n}e2`)) + 'e-2');
    return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
}
/**
 * Exact-decimal multiplication of a money amount by a business factor
 * (e.g. subtotal × vatRate). Plain float multiplication corrupts money math:
 * 11500.05 × 0.1 evaluates to 1150.0049999999999 in IEEE doubles, misclassifying
 * the true 1150.005 half-cent boundary and rounding VAT to 1150.00 instead of
 * 1150.01. The double nearest 11500.05 is genuinely *below* it, so no amount of
 * string surgery on the product recovers the decimal input — instead:
 *   - the money operand is already cent-rounded (validation guarantees ≤ 2dp),
 *     so it is read as exact integer cents;
 *   - the factor (a business rate like 0.15/0.1/0.07) has its decimal error
 *     beyond the 15th significant digit, so its fixed(12) text after trailing-
 *     zero trimming IS the decimal the caller intended;
 *   - the product of these two exact integers is reassembled losslessly and
 *     handed to round2(), which then rounds the true decimal value.
 */
function mulExact(money, factor) {
    const cents = Math.round(Math.abs(money) * 100); // exact for cent-rounded money
    let fs = factor.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
    if (fs === '0')
        return 0;
    const negFactor = fs.startsWith('-');
    if (negFactor)
        fs = fs.slice(1);
    const [fInt, fFrac = ''] = fs.split('.');
    const scale = 2 + fFrac.length; // cents × factor-digits
    const abs = (BigInt(cents) * BigInt(`${fInt || '0'}${fFrac}`)).toString();
    const padded = abs.padStart(scale + 1, '0');
    const value = Number(`${padded.slice(0, -scale)}.${padded.slice(-scale)}`);
    return (negFactor ? -value : value) * (money < 0 ? -1 : 1);
}
const serviceSnapshotSchema = new mongoose_1.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, enum: Object.values(ServiceLibraryItem_1.ServiceCategory), required: true },
    unit: { type: String, required: true },
    pricingModel: { type: String, enum: Object.values(ServiceLibraryItem_1.PricingModel), required: true },
    structuredDetails: { type: [new mongoose_1.Schema({ key: String, label: String, value: String }, { _id: false })], default: [] },
    maleGuardsPerDay: { type: Number, default: null },
    femaleGuardsPerDay: { type: Number, default: null },
    maleGuardsPerMonth: { type: Number, default: null },
    femaleGuardsPerMonth: { type: Number, default: null },
    monthlySalaryBeforeVatMale: { type: Number, default: null },
    monthlySalaryBeforeVatFemale: { type: Number, default: null },
    shiftNote: { type: String, default: '' },
    equipmentItems: {
        type: [
            new mongoose_1.Schema({ name: String, quantity: Number, unit: String, notes: String }, { _id: false }),
        ],
        default: [],
    },
    installationNote: { type: String, default: '' },
    libraryActiveAtQuotation: { type: Boolean, required: true },
}, { _id: false });
const clientSchema = new mongoose_1.Schema({
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Company', default: null },
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '', trim: true },
    tin: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    recipient: { type: String, default: '', trim: true },
}, { _id: false });
const lineSchema = new mongoose_1.Schema({
    serviceItemId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ServiceLibraryItem', required: true },
    snapshot: { type: serviceSnapshotSchema, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, uppercase: true },
    unitPrice: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
}, { _id: false });
const proformaSchema = new mongoose_1.Schema({
    number: { type: String, required: true, match: /^PRO-\d{4}-\d{4,}$/ },
    status: { type: String, enum: Object.values(ProformaStatus), required: true, default: ProformaStatus.DRAFT },
    revisionNumber: { type: Number, required: true, min: 1, default: 1 },
    revisesId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Proforma', default: null },
    liveRevisionId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Proforma', default: null },
    supersededById: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Proforma', default: null },
    client: { type: clientSchema, required: true },
    lines: { type: [lineSchema], required: true, min: 1 },
    validUntil: { type: Date, default: null },
    vatRate: { type: Number, required: true, min: 0, max: exports.PROFORMA_MAX_VAT_RATE, default: exports.PROFORMA_DEFAULT_VAT_RATE },
    subtotal: { type: Number, required: true, min: 0 },
    vatAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '', trim: true, maxlength: 4000 },
    issuedAt: { type: Date, default: null },
    issuedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });
proformaSchema.index({ status: 1 });
proformaSchema.index({ number: 1 }, { unique: true });
proformaSchema.index({ 'client.companyId': 1 });
proformaSchema.index({ issuedAt: -1 });
proformaSchema.index({ revisesId: 1 });
// NOTE: the "one live amendment per parent" invariant is enforced by an ATOMIC
// parent claim (liveRevisionId, see ProformaService.amend), not by a partial
// unique index — plain drafts (revisesId null) and the $in status filter make
// such an index a duplicate-key trap.
exports.Proforma = mongoose_1.default.model('Proforma', proformaSchema);
//# sourceMappingURL=Proforma.js.map