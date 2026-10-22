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
exports.VehicleDocument = exports.VehicleMaintenance = exports.VehicleAssignment = exports.Driver = exports.Vehicle = exports.MaintenanceStatus = exports.MaintenanceType = exports.VehicleStatus = exports.VehicleType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
/**
 * FLEET PHASE 1 MODELS — vehicles, drivers (employee links), effective-dated
 * assignments, maintenance and vehicle documents. Trips, fuel, Finance and
 * GPS are deliberately out of scope for Phase 1.
 */
var VehicleType;
(function (VehicleType) {
    VehicleType["CAR"] = "CAR";
    VehicleType["PICKUP"] = "PICKUP";
    VehicleType["MOTORCYCLE"] = "MOTORCYCLE";
    VehicleType["TRUCK"] = "TRUCK";
    VehicleType["VAN"] = "VAN";
    VehicleType["OTHER"] = "OTHER";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var VehicleStatus;
(function (VehicleStatus) {
    VehicleStatus["ACTIVE"] = "ACTIVE";
    VehicleStatus["INACTIVE"] = "INACTIVE";
    VehicleStatus["IN_MAINTENANCE"] = "IN_MAINTENANCE";
    VehicleStatus["DISPOSED"] = "DISPOSED";
})(VehicleStatus || (exports.VehicleStatus = VehicleStatus = {}));
var MaintenanceType;
(function (MaintenanceType) {
    MaintenanceType["ROUTINE_SERVICE"] = "ROUTINE_SERVICE";
    MaintenanceType["REPAIR"] = "REPAIR";
    MaintenanceType["INSPECTION"] = "INSPECTION";
    MaintenanceType["TIRE_CHANGE"] = "TIRE_CHANGE";
    MaintenanceType["OTHER"] = "OTHER";
})(MaintenanceType || (exports.MaintenanceType = MaintenanceType = {}));
var MaintenanceStatus;
(function (MaintenanceStatus) {
    MaintenanceStatus["SCHEDULED"] = "SCHEDULED";
    MaintenanceStatus["IN_PROGRESS"] = "IN_PROGRESS";
    MaintenanceStatus["COMPLETED"] = "COMPLETED";
    MaintenanceStatus["CANCELLED"] = "CANCELLED";
})(MaintenanceStatus || (exports.MaintenanceStatus = MaintenanceStatus = {}));
const vehicleSchema = new mongoose_1.Schema({
    plateNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    make: { type: String, required: true, trim: true },
    modelName: { type: String, required: true, trim: true },
    vehicleType: { type: String, enum: Object.values(VehicleType), required: true },
    year: { type: Number, min: 1950, max: 2100 },
    color: { type: String, trim: true },
    vin: { type: String, trim: true, uppercase: true },
    status: { type: String, enum: Object.values(VehicleStatus), default: VehicleStatus.ACTIVE },
    assignedSiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Site', default: null },
    currentOdometer: { type: Number, min: 0, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ assignedSiteId: 1 });
const driverSchema = new mongoose_1.Schema({
    employeeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Employee', required: true, unique: true },
    licenseNumber: { type: String, required: true, trim: true },
    licenseType: { type: String, trim: true },
    licenseExpiry: { type: Date },
    isAvailable: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
driverSchema.index({ isAvailable: 1 });
const vehicleAssignmentSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driverId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Driver', required: true },
    purpose: { type: String, trim: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    assignedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    isCurrent: { type: Boolean, default: true },
}, { timestamps: true });
vehicleAssignmentSchema.index({ vehicleId: 1, isCurrent: 1 });
vehicleAssignmentSchema.index({ driverId: 1, isCurrent: 1 });
// Overlap prevention: one current assignment per vehicle and per driver.
vehicleAssignmentSchema.index({ vehicleId: 1 }, { unique: true, partialFilterExpression: { isCurrent: true, effectiveTo: null } });
vehicleAssignmentSchema.index({ driverId: 1 }, { unique: true, partialFilterExpression: { isCurrent: true, effectiveTo: null } });
const vehicleMaintenanceSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    maintenanceType: { type: String, enum: Object.values(MaintenanceType), required: true },
    status: { type: String, enum: Object.values(MaintenanceStatus), default: MaintenanceStatus.SCHEDULED },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    odometerAtService: { type: Number, min: 0 },
    description: { type: String, trim: true },
    serviceCenter: { type: String, trim: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
vehicleMaintenanceSchema.index({ vehicleId: 1, status: 1 });
vehicleMaintenanceSchema.index({ scheduledDate: 1 });
const vehicleDocumentSchema = new mongoose_1.Schema({
    vehicleId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    documentType: { type: String, required: true, trim: true },
    fileName: { type: String, required: true, trim: true },
    fileUrl: { type: String, required: true, trim: true },
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
vehicleDocumentSchema.index({ vehicleId: 1 });
vehicleDocumentSchema.index({ expiryDate: 1 });
exports.Vehicle = mongoose_1.default.model('Vehicle', vehicleSchema);
exports.Driver = mongoose_1.default.model('Driver', driverSchema);
exports.VehicleAssignment = mongoose_1.default.model('VehicleAssignment', vehicleAssignmentSchema);
exports.VehicleMaintenance = mongoose_1.default.model('VehicleMaintenance', vehicleMaintenanceSchema);
exports.VehicleDocument = mongoose_1.default.model('VehicleDocument', vehicleDocumentSchema);
//# sourceMappingURL=fleet.models.js.map