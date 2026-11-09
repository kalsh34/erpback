import mongoose, { Document } from 'mongoose';
import { CompanyStatus } from '../types';
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
export declare enum RoleGender {
    MALE = "MALE",
    FEMALE = "FEMALE",
    UNISEX = "UNISEX",
    NA = "NA"
}
export declare enum RoleCategory {
    MANPOWER = "MANPOWER",
    K9 = "K9",
    ELECTRONIC = "ELECTRONIC",
    OTHER = "OTHER"
}
export declare enum RateType {
    MONTHLY = "MONTHLY",
    DAILY = "DAILY"
}
export declare enum ShiftPattern {
    CONTINUOUS_24_48 = "CONTINUOUS_24_48",
    DAY_SHIFT = "DAY_SHIFT",
    CUSTOM = "CUSTOM"
}
/** Human wording of a shift pattern, used in auto-generated proforma notes. */
export declare function describeShiftPattern(pattern: ShiftPattern): string;
export interface IServiceRole extends Document {
    roleCode: string;
    roleName: string;
    gender: RoleGender;
    category: RoleCategory;
    description: string;
    defaultMonthlyRate: number;
    rateType: RateType;
    vatApplicable: boolean;
    allowRateOverride: boolean;
    shiftPattern: ShiftPattern;
    multiplier: number;
    restDaysRule: string;
    status: CompanyStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ServiceRole: mongoose.Model<IServiceRole, {}, {}, {}, mongoose.Document<unknown, {}, IServiceRole, {}, {}> & IServiceRole & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=ServiceRole.d.ts.map