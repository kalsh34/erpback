import mongoose, { Document } from 'mongoose';
import { RoleCategory, RoleGender, ShiftPattern } from './ServiceRole';
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
export declare enum ProformaStatus {
    DRAFT = "DRAFT",
    ISSUED = "ISSUED",
    ACCEPTED = "ACCEPTED",
    EXPIRED = "EXPIRED",
    CONVERTED = "CONVERTED",
    CANCELLED = "CANCELLED"
}
/** Statuses a proforma may move to from its current status. */
export declare const PROFORMA_TRANSITIONS: Record<ProformaStatus, ProformaStatus[]>;
/** Fixed VAT rate for the module (rule 6). */
export declare const PROFORMA_VAT_RATE = 0.15;
/** Default quote validity in days (rule 5). */
export declare const PROFORMA_DEFAULT_VALIDITY_DAYS = 15;
/** Round money to 2 decimals, half-up (business rounding). */
export declare function round2(n: number): number;
/** Headcount + line value for one quoted role (rule 3). */
export declare function computeItemValues(postsPerDay: number, multiplier: number, unitRate: number): {
    totalHeadcount: number;
    lineTotal: number;
};
/**
 * Document totals. VAT is charged on the VAT-applicable lines only (rule 6);
 * subtotal and grandTotal are cent-rounded.
 */
export declare function computeProformaTotals(items: Array<{
    lineTotal: number;
    vatApplicable: boolean;
}>, vatRate?: number): {
    subtotal: number;
    vatAmount: number;
    grandTotal: number;
};
/** Add calendar days to a date (local midnight, DST-safe). */
export declare function addDays(date: Date, days: number): Date;
export interface IProformaItem {
    roleId: mongoose.Types.ObjectId;
    roleCode: string;
    roleName: string;
    gender: RoleGender;
    /** Catalog category at quote time (MANPOWER vs K9/ELECTRONIC/OTHER). */
    category: RoleCategory;
    postsPerDay: number;
    multiplier: number;
    totalHeadcount: number;
    unitRate: number;
    lineTotal: number;
    vatApplicable: boolean;
    shiftPattern: ShiftPattern;
    restDaysRule: string;
}
export interface IProforma extends Document {
    number: string;
    companyId: mongoose.Types.ObjectId;
    siteId: mongoose.Types.ObjectId;
    issueDate: Date;
    validityDays: number;
    validityDate: Date;
    status: ProformaStatus;
    items: IProformaItem[];
    subtotal: number;
    vatAmount: number;
    grandTotal: number;
    shiftNote: string;
    notes: string;
    internalNotes: string;
    deliveryEmailPdf: boolean;
    deliveryHardCopy: boolean;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    issuedBy?: mongoose.Types.ObjectId | null;
    issuedAt?: Date | null;
    cancelledAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Proforma: mongoose.Model<IProforma, {}, {}, {}, mongoose.Document<unknown, {}, IProforma, {}, {}> & IProforma & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Proforma.d.ts.map