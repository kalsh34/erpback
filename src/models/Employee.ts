import mongoose, { Schema, Document } from 'mongoose';
import { EmployeeCategory, EmployeeStatus, Gender, EmploymentType } from '../types';

export interface IEmployee extends Document {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  category: EmployeeCategory;
  status: EmployeeStatus;
  companyId?: mongoose.Types.ObjectId;
  partyId?: mongoose.Types.ObjectId;
  homeSiteId?: mongoose.Types.ObjectId;
  dateOfBirth?: Date;
  gender?: Gender;
  phone?: string;
  email?: string;
  address?: string;
  hireDate?: Date;
  department?: string;
  position?: string;
  documents?: { title: string; url: string; fileName: string; uploadedAt: Date }[];
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  salary?: number;
  transportAllowance?: number;
  statusHistory?: {
    from: EmployeeStatus;
    to: EmployeeStatus;
    reason: string;
    changedBy?: mongoose.Types.ObjectId;
    changedAt: Date;
  }[];
  guardInfo?: {
    employmentType: EmploymentType;
    idCardNumber?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<IEmployee>(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, required: true, trim: true },
    category: { type: String, enum: Object.values(EmployeeCategory), required: true },
    status: { type: String, enum: Object.values(EmployeeStatus), default: EmployeeStatus.INACTIVE },
    companyId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null },
    partyId: { type: Schema.Types.ObjectId, ref: 'Party', default: null },
    homeSiteId: { type: Schema.Types.ObjectId, ref: 'Site', default: null },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: Object.values(Gender) },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    hireDate: { type: Date },
    department: { type: String, trim: true },
    position: { type: String, trim: true },
    documents: [{
      title: { type: String, required: true, trim: true },
      url: { type: String, required: true },
      fileName: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
    }],
    bankName: { type: String, trim: true },
    bankBranch: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    salary: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    statusHistory: [{
      from: { type: String, enum: Object.values(EmployeeStatus), required: true },
      to: { type: String, enum: Object.values(EmployeeStatus), required: true },
      reason: { type: String, required: true, trim: true },
      changedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
      changedAt: { type: Date, default: Date.now },
    }],
    guardInfo: {
      employmentType: { type: String, enum: Object.values(EmploymentType) },
      idCardNumber: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

employeeSchema.virtual('fullName').get(function () {
  return [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
});

employeeSchema.set('toJSON', { virtuals: true });

employeeSchema.index({ employeeCode: 1 });
employeeSchema.index({ category: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ lastName: 1, firstName: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', employeeSchema);
