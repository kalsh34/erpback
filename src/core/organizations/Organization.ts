import mongoose, { Schema, Document } from 'mongoose';

export enum OrganizationType {
  COMPANY = 'COMPANY',
  BRANCH = 'BRANCH',
  DEPARTMENT = 'DEPARTMENT',
  COST_CENTER = 'COST_CENTER',
}

export interface IOrganization extends Document {
  name: string;
  code: string;
  type: OrganizationType;
  parentId?: mongoose.Types.ObjectId;
  companyId?: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId;
  description?: string;
  employeeCodePrefix?: string;
  nextEmployeeCode?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: Object.values(OrganizationType), required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    companyId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, trim: true },
    employeeCodePrefix: { type: String, trim: true },
    nextEmployeeCode: { type: Number, default: 100 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

organizationSchema.index({ code: 1 });
organizationSchema.index({ type: 1 });
organizationSchema.index({ companyId: 1 });
organizationSchema.index({ parentId: 1 });

export const Organization = mongoose.model<IOrganization>('Organization', organizationSchema);
