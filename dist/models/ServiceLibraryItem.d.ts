import mongoose, { Document } from 'mongoose';
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
export declare enum ServiceCategory {
    GUARD_SERVICE = "GUARD_SERVICE",
    CCTV = "CCTV",
    ALARM = "ALARM",
    QR_PATROL = "QR_PATROL",
    ACCESS_CONTROL = "ACCESS_CONTROL",
    CUSTOM = "CUSTOM"
}
export declare enum PricingModel {
    MONTHLY_PER_GUARD = "MONTHLY_PER_GUARD",
    PER_DAY = "PER_DAY",
    PER_UNIT = "PER_UNIT",
    PER_INSTALLATION = "PER_INSTALLATION",
    CUSTOM = "CUSTOM"
}
/** One labeled value line of a service description (flexible detail block). */
export interface IServiceDetailEntry {
    key: string;
    label: string;
    value: string;
}
export interface IServiceLibraryItem extends Document {
    /** Stable, unique business code, e.g. SVC-GUARD-M. */
    code: string;
    name: string;
    description: string;
    category: ServiceCategory;
    /** Metering word shown on proforma lines, e.g. MONTH, DAY, UNIT, POINT. */
    unit: string;
    pricingModel: PricingModel;
    /** Optional default unit price (ETB, VAT-exclusive). Null = price is always set per proforma. */
    defaultUnitPrice: number | null;
    currency: string;
    /** Category-specific structured detail lines (current-value template, not a snapshot). */
    structuredDetails: IServiceDetailEntry[];
    maleGuardsPerDay?: number | null;
    femaleGuardsPerDay?: number | null;
    maleGuardsPerMonth?: number | null;
    femaleGuardsPerMonth?: number | null;
    monthlySalaryBeforeVatMale?: number | null;
    monthlySalaryBeforeVatFemale?: number | null;
    shiftNote?: string;
    equipmentItems: Array<{
        name: string;
        quantity: number;
        unit: string;
        notes?: string;
    }>;
    installationNote?: string;
    /** Soft deactivation — entries referenced by future proformas are never hard-deleted. */
    isActive: boolean;
    deactivatedAt?: Date | null;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ServiceLibraryItem: mongoose.Model<IServiceLibraryItem, {}, {}, {}, mongoose.Document<unknown, {}, IServiceLibraryItem, {}, {}> & IServiceLibraryItem & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ServiceLibraryItem.d.ts.map