import mongoose, { Document } from 'mongoose';
/**
 * FLEET PHASE 1 MODELS — vehicles, drivers (employee links), effective-dated
 * assignments, maintenance and vehicle documents. Trips, fuel, Finance and
 * GPS are deliberately out of scope for Phase 1.
 */
export declare enum VehicleType {
    CAR = "CAR",
    PICKUP = "PICKUP",
    MOTORCYCLE = "MOTORCYCLE",
    TRUCK = "TRUCK",
    VAN = "VAN",
    OTHER = "OTHER"
}
export declare enum VehicleStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    IN_MAINTENANCE = "IN_MAINTENANCE",
    DISPOSED = "DISPOSED"
}
export declare enum MaintenanceType {
    ROUTINE_SERVICE = "ROUTINE_SERVICE",
    REPAIR = "REPAIR",
    INSPECTION = "INSPECTION",
    TIRE_CHANGE = "TIRE_CHANGE",
    OTHER = "OTHER"
}
export declare enum MaintenanceStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
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
export declare const Vehicle: mongoose.Model<IVehicle, {}, {}, {}, mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const Driver: mongoose.Model<IDriver, {}, {}, {}, mongoose.Document<unknown, {}, IDriver, {}, {}> & IDriver & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const VehicleAssignment: mongoose.Model<IVehicleAssignment, {}, {}, {}, mongoose.Document<unknown, {}, IVehicleAssignment, {}, {}> & IVehicleAssignment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const VehicleMaintenance: mongoose.Model<IVehicleMaintenance, {}, {}, {}, mongoose.Document<unknown, {}, IVehicleMaintenance, {}, {}> & IVehicleMaintenance & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export declare const VehicleDocument: mongoose.Model<IVehicleDocument, {}, {}, {}, mongoose.Document<unknown, {}, IVehicleDocument, {}, {}> & IVehicleDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=fleet.models.d.ts.map