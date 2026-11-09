import mongoose, { Schema, Document } from 'mongoose';
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

export enum RoleGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNISEX = 'UNISEX',
  NA = 'NA',
}

export enum RoleCategory {
  MANPOWER = 'MANPOWER',
  K9 = 'K9',
  ELECTRONIC = 'ELECTRONIC',
  OTHER = 'OTHER',
}

export enum RateType {
  MONTHLY = 'MONTHLY',
  DAILY = 'DAILY',
}

export enum ShiftPattern {
  CONTINUOUS_24_48 = 'CONTINUOUS_24_48',
  DAY_SHIFT = 'DAY_SHIFT',
  CUSTOM = 'CUSTOM',
}

/** Human wording of a shift pattern, used in auto-generated proforma notes. */
export function describeShiftPattern(pattern: ShiftPattern): string {
  switch (pattern) {
    case ShiftPattern.CONTINUOUS_24_48:
      return '24 hours on duty / 48 hours rest (continuous 24/48 shift)';
    case ShiftPattern.DAY_SHIFT:
      return 'day shift (12 hours per day)';
    default:
      return 'custom shift pattern';
  }
}

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

const serviceRoleSchema = new Schema<IServiceRole>(
  {
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
    status: { type: String, enum: Object.values(CompanyStatus), default: CompanyStatus.ACTIVE },
  },
  { timestamps: true }
);

serviceRoleSchema.index({ roleCode: 1 }, { unique: true });
serviceRoleSchema.index({ status: 1 });
serviceRoleSchema.index({ roleName: 1 });

export const ServiceRole = mongoose.model<IServiceRole>('ServiceRole', serviceRoleSchema);
