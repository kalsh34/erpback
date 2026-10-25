import { Types } from 'mongoose';
import { VehicleStatus, IVehicle, IDriver, IVehicleAssignment, IVehicleMaintenance, IVehicleDocument } from './fleet.models';
import mongoose from 'mongoose';
interface AuditCtx {
    ip?: string;
    ua?: string;
}
export declare class FleetService {
    static listVehicles(filters?: {
        status?: string;
        vehicleType?: string;
        q?: string;
    }): Promise<(mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static getVehicle(id: string): Promise<{
        vehicle: mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
        assignments: (mongoose.Document<unknown, {}, IVehicleAssignment, {}, {}> & IVehicleAssignment & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        maintenance: (mongoose.Document<unknown, {}, IVehicleMaintenance, {}, {}> & IVehicleMaintenance & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
        documents: (mongoose.Document<unknown, {}, IVehicleDocument, {}, {}> & IVehicleDocument & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        })[];
    }>;
    static createVehicle(body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateVehicle(id: string, body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    /** Status transitions are audited and constraint-checked (DISPOSED terminates assignments). */
    static setVehicleStatus(id: string, status: VehicleStatus, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicle, {}, {}> & IVehicle & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listDrivers(filters?: {
        q?: string;
        available?: string;
    }): Promise<any[]>;
    static createDriver(body: any, userId: string, auditCtx?: AuditCtx): Promise<Omit<mongoose.Document<unknown, {}, IDriver, {}, {}> & IDriver & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, never>>;
    static updateDriver(id: string, body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IDriver, {}, {}> & IDriver & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listAssignments(filters?: {
        vehicleId?: string;
        driverId?: string;
        current?: string;
    }): Promise<(mongoose.Document<unknown, {}, IVehicleAssignment, {}, {}> & IVehicleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    /** Assign a vehicle to a driver. Atomic: overlap check + create + driver availability in one transaction. */
    static createAssignment(body: any, userId: string, auditCtx?: AuditCtx): Promise<Omit<mongoose.Document<unknown, {}, IVehicleAssignment, {}, {}> & IVehicleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }, never>>;
    /** End an assignment (returns the vehicle and frees the driver). Atomic. */
    static endAssignment(id: string, effectiveTo: string | undefined, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicleAssignment, {}, {}> & IVehicleAssignment & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listMaintenance(filters?: {
        vehicleId?: string;
        status?: string;
        dueBefore?: string;
    }): Promise<(mongoose.Document<unknown, {}, IVehicleMaintenance, {}, {}> & IVehicleMaintenance & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static createMaintenance(body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicleMaintenance, {}, {}> & IVehicleMaintenance & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static updateMaintenance(id: string, body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicleMaintenance, {}, {}> & IVehicleMaintenance & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static listDocuments(vehicleId: string): Promise<(mongoose.Document<unknown, {}, IVehicleDocument, {}, {}> & IVehicleDocument & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    })[]>;
    static createDocument(body: any, userId: string, auditCtx?: AuditCtx): Promise<mongoose.Document<unknown, {}, IVehicleDocument, {}, {}> & IVehicleDocument & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    static deleteDocument(id: string, userId: string, auditCtx?: AuditCtx): Promise<{
        deleted: boolean;
    }>;
    /**
     * Scan all vehicle documents for expiry within the notice window and raise
     * one notification per recipient (duplicate-safe: idempotent per run).
     */
    static scanDocumentExpiry(userId: string, noticeDays?: number): Promise<{
        notified: number;
        expiring: {
            id: string;
            documentType: string;
        }[];
    } | {
        notified: number;
        expiring: {
            id: string;
            documentType: any;
            expiryDate: any;
            plateNumber: any;
        }[];
    }>;
}
export {};
//# sourceMappingURL=fleet.service.d.ts.map