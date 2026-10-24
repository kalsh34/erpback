import mongoose, { Schema, Document } from 'mongoose';

/**
 * FLEET PHASE 1 MODELS — vehicles, drivers (employee links), effective-dated
 * assignments, maintenance and vehicle documents. Trips, fuel, Finance and
 * GPS are deliberately out of scope for Phase 1.
 */

export enum VehicleType {
  CAR = 'CAR',
  PICKUP = 'PICKUP',
  MOTORCYCLE = 'MOTORCYCLE',
  TRUCK = 'TRUCK',
  VAN = 'VAN',
  OTHER = 'OTHER',
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  DISPOSED = 'DISPOSED',
}

export enum MaintenanceType {
  ROUTINE_SERVICE = 'ROUTINE_SERVICE',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  TIRE_CHANGE = 'TIRE_CHANGE',
  OTHER = 'OTHER',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IVehicle extends Document {
  plateNumber: string;
  make: string;
  /** Vehicle model name (string, not the mongoose `model` helper). */
  modelName: string;
  vehicleType: VehicleType;
  year?: number;
  color?: string;
  vin?: string;
  status: VehicleStatus;
  assignedSiteId?: mongoose.Types.ObjectId | null;
  currentOdometer?: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>(
  {
    plateNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    make: { type: String, required: true, trim: true },
    modelName: { type: String, required: true, trim: true },
    vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
    year: { type: Number, min: 1950, max: 2100 },
    color: { type: String, trim: true },
    vin: { type: String, trim: true, uppercase: true },
    status: { type: String, enum: Object.values(VehicleStatus), default: VehicleStatus.ACTIVE },
    assignedSiteId: { type: Schema.Types.ObjectId, ref: 'Site', default: null },
    currentOdometer: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1 });
vehicleSchema.index({ assignedSiteId: 1 });

export interface IDriver extends Document {
  employeeId: mongoose.Types.ObjectId;
  licenseNumber: string;
  licenseType?: string;
  licenseExpiry?: Date;
  isAvailable: boolean;
  /** Free-form note, e.g. suspension. Availability flips automatically on vehicle assignment. */
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseType: { type: String, trim: true },
    licenseExpiry: { type: Date },
    isAvailable: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

driverSchema.index({ isAvailable: 1 });

export interface IVehicleAssignment extends Document {
  vehicleId: mongoose.Types.ObjectId;
  driverId: mongoose.Types.ObjectId;
  purpose?: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  assignedBy: mongoose.Types.ObjectId;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleAssignmentSchema = new Schema<IVehicleAssignment>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    purpose: { type: String, trim: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isCurrent: { type: Boolean, default: true },
  },
  { timestamps: true }
);

vehicleAssignmentSchema.index({ vehicleId: 1, isCurrent: 1 });
vehicleAssignmentSchema.index({ driverId: 1, isCurrent: 1 });
// Overlap prevention: one current assignment per vehicle and per driver.
vehicleAssignmentSchema.index(
  { vehicleId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true, effectiveTo: null } }
);
vehicleAssignmentSchema.index(
  { driverId: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true, effectiveTo: null } }
);

export interface IVehicleMaintenance extends Document {
  vehicleId: mongoose.Types.ObjectId;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate?: Date;
  completedDate?: Date;
  odometerAtService?: number;
  description?: string;
  serviceCenter?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleMaintenanceSchema = new Schema<IVehicleMaintenance>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    maintenanceType: { type: String, enum: Object.values(MaintenanceType), required: true },
    status: { type: String, enum: Object.values(MaintenanceStatus), default: MaintenanceStatus.SCHEDULED },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    odometerAtService: { type: Number, min: 0 },
    description: { type: String, trim: true },
    serviceCenter: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

vehicleMaintenanceSchema.index({ vehicleId: 1, status: 1 });
vehicleMaintenanceSchema.index({ scheduledDate: 1 });

export interface IVehicleDocument extends Document {
  vehicleId: mongoose.Types.ObjectId;
  documentType: string;
  fileName: string;
  fileUrl: string;
  issuedDate?: Date;
  expiryDate?: Date;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleDocumentSchema = new Schema<IVehicleDocument>(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    documentType: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

vehicleDocumentSchema.index({ vehicleId: 1 });
vehicleDocumentSchema.index({ expiryDate: 1 });

export const Vehicle = mongoose.model<IVehicle>('Vehicle', vehicleSchema);
export const Driver = mongoose.model<IDriver>('Driver', driverSchema);
export const VehicleAssignment = mongoose.model<IVehicleAssignment>('VehicleAssignment', vehicleAssignmentSchema);
export const VehicleMaintenance = mongoose.model<IVehicleMaintenance>('VehicleMaintenance', vehicleMaintenanceSchema);
export const VehicleDocument = mongoose.model<IVehicleDocument>('VehicleDocument', vehicleDocumentSchema);
