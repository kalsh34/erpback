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
exports.Organization = exports.OrganizationType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var OrganizationType;
(function (OrganizationType) {
    OrganizationType["COMPANY"] = "COMPANY";
    OrganizationType["BRANCH"] = "BRANCH";
    OrganizationType["DEPARTMENT"] = "DEPARTMENT";
    OrganizationType["COST_CENTER"] = "COST_CENTER";
})(OrganizationType || (exports.OrganizationType = OrganizationType = {}));
const organizationSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: Object.values(OrganizationType), required: true },
    parentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', default: null },
    companyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Organization', default: null },
    manager: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, trim: true },
    employeeCodePrefix: { type: String, trim: true },
    nextEmployeeCode: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
organizationSchema.index({ code: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ companyId: 1 });
organizationSchema.index({ parentId: 1 });
exports.Organization = mongoose_1.default.model('Organization', organizationSchema);
//# sourceMappingURL=Organization.js.map