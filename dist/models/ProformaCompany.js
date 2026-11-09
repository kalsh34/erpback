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
exports.ProformaCompany = exports.CompanyKind = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
/**
 * PROFORMA CLIENT COMPANY (Proforma module — company registration).
 *
 * A company must be registered here, with at least one contact person, BEFORE
 * any proforma can be issued to it. TIN is the natural business key and is
 * unique (a duplicate TIN is a data-entry error, not a second company).
 *
 * This collection is deliberately separate from the HR `Company` model
 * (`models/Company.ts`), which describes the group's own operating entities and
 * carries payroll/agreement pricing. Marketing clients are commercial records
 * only: identity, billing address and contact persons.
 */
var CompanyKind;
(function (CompanyKind) {
    CompanyKind["PRIVATE_LIMITED"] = "PRIVATE_LIMITED";
    CompanyKind["SHARE_COMPANY"] = "SHARE_COMPANY";
    CompanyKind["SOLE_PROPRIETORSHIP"] = "SOLE_PROPRIETORSHIP";
    CompanyKind["PARTNERSHIP"] = "PARTNERSHIP";
    CompanyKind["PUBLIC_ENTERPRISE"] = "PUBLIC_ENTERPRISE";
    CompanyKind["NGO"] = "NGO";
    CompanyKind["OTHER"] = "OTHER";
})(CompanyKind || (exports.CompanyKind = CompanyKind = {}));
const contactSchema = new mongoose_1.Schema({
    fullName: { type: String, required: true, trim: true },
    position: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    isPrimary: { type: Boolean, default: false },
}, { _id: false });
const proformaCompanySchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    nameAm: { type: String, default: '', trim: true },
    tin: { type: String, required: true, trim: true, uppercase: true },
    registrationNumber: { type: String, default: '', trim: true },
    companyType: { type: String, enum: Object.values(CompanyKind), default: CompanyKind.PRIVATE_LIMITED },
    industry: { type: String, default: '', trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true },
    primaryPhone: { type: String, required: true, trim: true },
    secondaryPhone: { type: String, default: '', trim: true },
    primaryEmail: { type: String, required: true, trim: true, lowercase: true },
    website: { type: String, default: '', trim: true },
    status: { type: String, enum: Object.values(types_1.CompanyStatus), default: types_1.CompanyStatus.ACTIVE },
    contacts: { type: [contactSchema], default: [] },
    deactivatedAt: { type: Date, default: null },
}, { timestamps: true });
proformaCompanySchema.index({ tin: 1 }, { unique: true });
proformaCompanySchema.index({ name: 1 });
proformaCompanySchema.index({ status: 1 });
exports.ProformaCompany = mongoose_1.default.model('ProformaCompany', proformaCompanySchema);
//# sourceMappingURL=ProformaCompany.js.map