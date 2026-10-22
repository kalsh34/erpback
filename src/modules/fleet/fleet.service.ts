import { Types } from 'mongoose';
import { Vehicle, Driver, VehicleAssignment, VehicleMaintenance, VehicleDocument,
  VehicleType, VehicleStatus, MaintenanceType, MaintenanceStatus,
  IVehicle, IDriver, IVehicleAssignment, IVehicleMaintenance, IVehicleDocument } from './fleet.models';
import { Employee } from '../../models/Employee';
import { EmployeeStatus } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditService } from '../../core/audit/AuditService';
import { Notification } from '../../models/Notification';
import { User } from '../../models/User';
import { payrollTransaction } from '../guardPayroll/payrollTransaction';
import mongoose from 'mongoose';

interface AuditCtx { ip?: string; ua?: string }

const asId = (v: unknown, field: string) => {
  if (typeof v !== 'string' || !Types.ObjectId.isValid(v)) throw ApiError.badRequest(`${field} must be a valid identifier`);
  return new Types.ObjectId(v);
};

function assertVehiclePayload(body: any) {
  if (!body?.plateNumber || typeof body.plateNumber !== 'string' || !body.plateNumber.trim()) throw ApiError.badRequest('Plate number is required.');
  if (!body?.make?.trim()) throw ApiError.badRequest('Make is required.');
  if (!body?.modelName?.trim() && !body?.model?.trim()) throw ApiError.badRequest('Model is required.');
  body.modelName = body.modelName?.trim() || body.model?.trim();
  if (!Object.values(VehicleType).includes(body.vehicleType)) throw ApiError.badRequest(`vehicleType must be one of: ${Object.values(VehicleType).join(', ')}`);
  if (body.year != null && (typeof body.year !== 'number' || body.year < 1950 || body.year > 2100)) throw ApiError.badRequest('year must be between 1950 and 2100.');
  if (body.currentOdometer != null && (typeof body.currentOdometer !== 'number' || body.currentOdometer < 0)) throw ApiError.badRequest('currentOdometer cannot be negative.');
}

function assertDriverPayload(body: any) {
  if (!body?.employeeId || typeof body.employeeId !== 'string') throw ApiError.badRequest('employeeId is required.');
  if (!body?.licenseNumber?.trim()) throw ApiError.badRequest('License number is required.');
}

/**
 * A driver must be a real, currently-usable Employee record — no duplicate
 * identity system: Driver is a role layer over Employee.
 */
async function assertEligibleDriver(employeeId: string) {
  const employee = await Employee.findById(employeeId).select('status category').lean();
  if (!employee) throw ApiError.badRequest('Linked employee does not exist.');
  if (employee.status !== EmployeeStatus.ACTIVE && employee.status !== EmployeeStatus.CONTRACTED) {
    throw ApiError.badRequest(`Employee must be ACTIVE or CONTRACTED to be registered as a driver (currently ${employee.status}).`);
  }
}

/** Effective-dated overlap check: a vehicle or driver can hold exactly one open assignment. */
async function assertNoActiveAssignment(query: { vehicleId?: string; driverId?: string }) {
  const conflict: Record<string, unknown> = { isCurrent: true, effectiveTo: null };
  if (query.vehicleId) conflict.vehicleId = new Types.ObjectId(query.vehicleId);
  if (query.driverId) conflict.driverId = new Types.ObjectId(query.driverId);
  const existing = await VehicleAssignment.findOne(conflict).populate('vehicleId driverId').lean();
  if (existing) {
    const v: any = (existing as any).vehicleId, d: any = (existing as any).driverId;
    const who = query.vehicleId ? `Vehicle ${v?.plateNumber || v}` : `Driver ${[d?.firstName, d?.lastName].filter(Boolean).join(' ') || d?.employeeId || d?._id}`;
    throw ApiError.conflict(`${who} already has an active assignment. Close it (set effectiveTo) before creating another.`);
  }
}

export class FleetService {
  // ── Vehicles ───────────────────────────────────────────────────────

  static async listVehicles(filters: { status?: string; vehicleType?: string; q?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.status && Object.values(VehicleStatus).includes(filters.status as VehicleStatus)) query.status = filters.status;
    if (filters.vehicleType && Object.values(VehicleType).includes(filters.vehicleType as VehicleType)) query.vehicleType = filters.vehicleType;
    if (filters.q?.trim()) query.$or = [
      { plateNumber: new RegExp(filters.q.trim(), 'i') },
      { make: new RegExp(filters.q.trim(), 'i') },
      { modelName: new RegExp(filters.q.trim(), 'i') },
    ];
    return Vehicle.find(query).populate('assignedSiteId', 'siteName siteCode').sort({ plateNumber: 1 }).limit(200);
  }

  static async getVehicle(id: string) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid vehicle ID: "${id}"`);
    const vehicle = await Vehicle.findById(id).populate('assignedSiteId', 'siteName siteCode');
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    const [assignments, maintenance, documents] = await Promise.all([
      VehicleAssignment.find({ vehicleId: vehicle._id }).populate({ path: 'driverId', populate: { path: 'employeeId', select: 'employeeCode firstName lastName status' } }).sort({ effectiveFrom: -1 }),
      VehicleMaintenance.find({ vehicleId: vehicle._id }).sort({ scheduledDate: -1 }).limit(50),
      VehicleDocument.find({ vehicleId: vehicle._id }).sort({ expiryDate: 1 }),
    ]);
    return { vehicle, assignments, maintenance, documents };
  }

  static async createVehicle(body: any, userId: string, auditCtx?: AuditCtx) {
    assertVehiclePayload(body);
    if (await Vehicle.findOne({ plateNumber: body.plateNumber.trim().toUpperCase() })) {
      throw ApiError.conflict(`A vehicle with plate "${body.plateNumber}" already exists.`);
    }
    const vehicle = await Vehicle.create({
      plateNumber: body.plateNumber.trim().toUpperCase(),
      make: body.make.trim(),
      modelName: body.modelName.trim(),
      vehicleType: body.vehicleType,
      year: body.year,
      color: body.color?.trim(),
      vin: body.vin?.trim().toUpperCase(),
      status: Object.values(VehicleStatus).includes(body.status) ? body.status : VehicleStatus.ACTIVE,
      assignedSiteId: body.assignedSiteId && Types.ObjectId.isValid(body.assignedSiteId) ? body.assignedSiteId : null,
      currentOdometer: body.currentOdometer ?? 0,
      notes: body.notes?.trim(),
      createdBy: userId,
    });
    await AuditService.log({ userId, action: 'FLEET_VEHICLE_CREATE', entity: 'Vehicle', entityId: String(vehicle._id),
      newValues: { plateNumber: vehicle.plateNumber, status: vehicle.status }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return vehicle;
  }

  static async updateVehicle(id: string, body: any, userId: string, auditCtx?: AuditCtx) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid vehicle ID: "${id}"`);
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    const editable = ['make', 'model', 'vehicleType', 'year', 'color', 'vin', 'notes', 'assignedSiteId', 'currentOdometer'] as const;
    const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
    for (const key of editable) {
      if (body[key] === undefined) continue;
      if (key === 'currentOdometer' || key === 'year') {
        const n = Number(body[key]);
        if (!Number.isFinite(n) || n < 0 || (key === 'year' && (n < 1950 || n > 2100))) throw ApiError.badRequest(`${key} is invalid.`);
      }
      if (key === 'assignedSiteId' && body[key] !== null && !Types.ObjectId.isValid(body[key])) throw ApiError.badRequest('assignedSiteId is not a valid site.');
      before[key] = (vehicle as any)[key]?.toString?.() ?? (vehicle as any)[key];
      (vehicle as any)[key] = body[key];
      after[key] = body[key];
    }
    await vehicle.save();
    await AuditService.log({ userId, action: 'FLEET_VEHICLE_UPDATE', entity: 'Vehicle', entityId: id, oldValues: before, newValues: after,
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return vehicle;
  }

  /** Status transitions are audited and constraint-checked (DISPOSED terminates assignments). */
  static async setVehicleStatus(id: string, status: VehicleStatus, userId: string, auditCtx?: AuditCtx) {
    if (!Object.values(VehicleStatus).includes(status)) throw ApiError.badRequest(`status must be one of: ${Object.values(VehicleStatus).join(', ')}`);
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid vehicle ID: "${id}"`);
    return payrollTransaction(async () => {
      const vehicle = await Vehicle.findById(id);
      if (!vehicle) throw ApiError.notFound('Vehicle not found');
      if (vehicle.status === status) return vehicle;
      const before = vehicle.status;
      vehicle.status = status;
      await vehicle.save();
      if (status === VehicleStatus.DISPOSED) {
        const open = await VehicleAssignment.findOne({ vehicleId: vehicle._id, isCurrent: true, effectiveTo: null });
        if (open) {
          open.effectiveTo = new Date();
          open.isCurrent = false;
          await open.save();
          await Driver.findByIdAndUpdate(open.driverId, { $set: { isAvailable: true } });
        }
      }
      await AuditService.log({ userId, action: 'FLEET_VEHICLE_STATUS_CHANGE', entity: 'Vehicle', entityId: id,
        oldValues: { status: before }, newValues: { status }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
      return vehicle;
    });
  }

  // ── Drivers ────────────────────────────────────────────────────────

  static async listDrivers(filters: { q?: string; available?: string } = {}) {
    const vehicleMatch: Record<string, unknown> = {};
    const query: Record<string, unknown> = {};
    if (filters.available === 'true') query.isAvailable = true;
    if (filters.q?.trim()) vehicleMatch.$or = [
      { employeeCode: new RegExp(filters.q.trim(), 'i') },
      { firstName: new RegExp(filters.q.trim(), 'i') },
      { lastName: new RegExp(filters.q.trim(), 'i') },
    ];
    const pipeline = [
      ...(Object.keys(vehicleMatch).length ? [{ $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'employee' } }] : []),
      ...(Object.keys(vehicleMatch).length ? [{ $match: { employee: { $elemMatch: vehicleMatch } } }] : []),
    ];
    // Simple path handles the common case; pipeline only for search.
    if (Object.keys(vehicleMatch).length === 0) {
      return Driver.find(query).populate({ path: 'employeeId', select: 'employeeCode firstName lastName status phone' }).sort({ _id: -1 }).limit(200);
    }
    return Driver.aggregate([...pipeline, { $sort: { _id: -1 } }, { $limit: 200 }, { $lookup: { from: 'employees', localField: 'employeeId', foreignField: '_id', as: 'employeeObj' } }, { $project: { licenseNumber: 1, licenseType: 1, licenseExpiry: 1, isAvailable: 1, notes: 1, employee: { $first: '$employeeObj' } } }]);
  }

  static async createDriver(body: any, userId: string, auditCtx?: AuditCtx) {
    assertDriverPayload(body);
    const employeeId = asId(body.employeeId, 'employeeId');
    if (await Driver.findOne({ employeeId })) throw ApiError.conflict('This employee is already registered as a driver.');
    await assertEligibleDriver(String(employeeId));
    const driver = await Driver.create({
      employeeId,
      licenseNumber: body.licenseNumber.trim(),
      licenseType: body.licenseType?.trim(),
      licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : undefined,
      isAvailable: true,
      notes: body.notes?.trim(),
      createdBy: userId,
    });
    await AuditService.log({ userId, action: 'FLEET_DRIVER_CREATE', entity: 'Driver', entityId: String(driver._id),
      newValues: { employeeId: String(employeeId), licenseNumber: driver.licenseNumber }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return driver.populate({ path: 'employeeId', select: 'employeeCode firstName lastName status' });
  }

  static async updateDriver(id: string, body: any, userId: string, auditCtx?: AuditCtx) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid driver ID: "${id}"`);
    const driver = await Driver.findById(id);
    if (!driver) throw ApiError.notFound('Driver not found');
    const editable = ['licenseNumber', 'licenseType', 'licenseExpiry', 'isAvailable', 'notes'] as const;
    const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
    for (const key of editable) {
      if (body[key] === undefined) continue;
      if (key === 'licenseNumber' && !String(body[key]).trim()) throw ApiError.badRequest('License number cannot be empty.');
      before[key] = (driver as any)[key] instanceof Date ? (driver as any)[key].toISOString() : (driver as any)[key];
      (driver as any)[key] = key === 'licenseExpiry' ? (body[key] ? new Date(body[key]) : undefined) : body[key];
      after[key] = body[key];
    }
    await driver.save();
    await AuditService.log({ userId, action: 'FLEET_DRIVER_UPDATE', entity: 'Driver', entityId: id, oldValues: before, newValues: after,
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return driver;
  }

  // ── Assignments ────────────────────────────────────────────────────

  static async listAssignments(filters: { vehicleId?: string; driverId?: string; current?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.vehicleId) query.vehicleId = asId(filters.vehicleId, 'vehicleId');
    if (filters.driverId) query.driverId = asId(filters.driverId, 'driverId');
    if (filters.current === 'true') query.isCurrent = true;
    return VehicleAssignment.find(query)
      .populate({ path: 'driverId', populate: { path: 'employeeId', select: 'employeeCode firstName lastName status' } })
      .populate('vehicleId', 'plateNumber make model vehicleType')
      .sort({ isCurrent: -1, effectiveFrom: -1 }).limit(200);
  }

  /** Assign a vehicle to a driver. Atomic: overlap check + create + driver availability in one transaction. */
  static async createAssignment(body: any, userId: string, auditCtx?: AuditCtx) {
    const vehicleId = asId(body?.vehicleId, 'vehicleId');
    const driverId = asId(body?.driverId, 'driverId');
    const effectiveFrom = body?.effectiveFrom ? new Date(body.effectiveFrom) : new Date();
    if (isNaN(effectiveFrom.getTime())) throw ApiError.badRequest('effectiveFrom is not a valid date.');
    if (body?.effectiveTo) {
      const effectiveTo = new Date(body.effectiveTo);
      if (isNaN(effectiveTo.getTime()) || effectiveTo < effectiveFrom) throw ApiError.badRequest('effectiveTo must be a valid date after effectiveFrom.');
    }
    return payrollTransaction(async () => {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw ApiError.notFound('Vehicle not found');
      if (vehicle.status !== VehicleStatus.ACTIVE) throw ApiError.conflict(`Vehicle is ${vehicle.status}; only ACTIVE vehicles can be assigned.`);
      const driver = await Driver.findById(driverId);
      if (!driver) throw ApiError.notFound('Driver not found');
      if (!driver.isAvailable) throw ApiError.conflict('Driver is already allocated to another vehicle.');
      await assertEligibleDriver(String(driver.employeeId));
      await assertNoActiveAssignment({ vehicleId: String(vehicleId) });
      await assertNoActiveAssignment({ driverId: String(driverId) });
      const assignment = await VehicleAssignment.create({
        vehicleId, driverId, purpose: body?.purpose?.trim(), effectiveFrom,
        effectiveTo: body?.effectiveTo ? new Date(body.effectiveTo) : null,
        assignedBy: userId, isCurrent: true,
      });
      await Driver.findByIdAndUpdate(driverId, { $set: { isAvailable: false } });
      if (vehicle.status === VehicleStatus.ACTIVE && body?.assignedToSite) {
        vehicle.assignedSiteId = asId(body.assignedToSite, 'assignedToSite');
        await vehicle.save();
      }
      await AuditService.log({ userId, action: 'FLEET_ASSIGNMENT_CREATE', entity: 'VehicleAssignment', entityId: String(assignment._id),
        newValues: { vehicleId: String(vehicleId), driverId: String(driverId), effectiveFrom: effectiveFrom.toISOString() },
        ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
      return assignment.populate({ path: 'driverId', populate: { path: 'employeeId', select: 'employeeCode firstName lastName' } });
    });
  }

  /** End an assignment (returns the vehicle and frees the driver). Atomic. */
  static async endAssignment(id: string, effectiveTo: string | undefined, userId: string, auditCtx?: AuditCtx) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid assignment ID: "${id}"`);
    return payrollTransaction(async () => {
      const assignment = await VehicleAssignment.findById(id);
      if (!assignment) throw ApiError.notFound('Assignment not found');
      if (!assignment.isCurrent || assignment.effectiveTo) throw ApiError.conflict('Assignment is already closed.');
      const to = effectiveTo ? new Date(effectiveTo) : new Date();
      if (isNaN(to.getTime())) throw ApiError.badRequest('effectiveTo is not a valid date.');
      if (to < assignment.effectiveFrom) throw ApiError.conflict('effectiveTo cannot be before effectiveFrom.');
      assignment.effectiveTo = to;
      assignment.isCurrent = false;
      await assignment.save();
      await Driver.findByIdAndUpdate(assignment.driverId, { $set: { isAvailable: true } });
      await AuditService.log({ userId, action: 'FLEET_ASSIGNMENT_END', entity: 'VehicleAssignment', entityId: id,
        newValues: { effectiveTo: to.toISOString() }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
      return assignment;
    });
  }

  // ── Maintenance ────────────────────────────────────────────────────

  static async listMaintenance(filters: { vehicleId?: string; status?: string; dueBefore?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.vehicleId) query.vehicleId = asId(filters.vehicleId, 'vehicleId');
    if (filters.status && Object.values(MaintenanceStatus).includes(filters.status as MaintenanceStatus)) query.status = filters.status;
    if (filters.dueBefore) {
      const before = new Date(filters.dueBefore);
      if (isNaN(before.getTime())) throw ApiError.badRequest('dueBefore is not a valid date.');
      query.status = MaintenanceStatus.SCHEDULED;
      query.scheduledDate = { $lte: before };
    }
    return VehicleMaintenance.find(query).populate('vehicleId', 'plateNumber make model').sort({ scheduledDate: -1 }).limit(200);
  }

  static async createMaintenance(body: any, userId: string, auditCtx?: AuditCtx) {
    if (!body?.vehicleId || !Types.ObjectId.isValid(String(body.vehicleId))) throw ApiError.badRequest('vehicleId is required.');
    if (!Object.values(MaintenanceType).includes(body.maintenanceType)) throw ApiError.badRequest(`maintenanceType must be one of: ${Object.values(MaintenanceType).join(', ')}`);
    if (body?.scheduledDate) { const d = new Date(body.scheduledDate); if (isNaN(d.getTime())) throw ApiError.badRequest('scheduledDate is not a valid date.'); }
    if (Object.values(MaintenanceStatus).includes(body.status) && body.status !== MaintenanceStatus.SCHEDULED) {
      throw ApiError.badRequest('New maintenance records must start as SCHEDULED; update the status afterwards.');
    }
    const [vehicle, record] = await Promise.all([
      Vehicle.findById(body.vehicleId).lean(),
      VehicleMaintenance.create({
        vehicleId: body.vehicleId, maintenanceType: body.maintenanceType,
        status: MaintenanceStatus.SCHEDULED, scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
        description: body.description?.trim(), serviceCenter: body.serviceCenter?.trim(),
        createdBy: userId,
      }),
    ]);
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    await AuditService.log({ userId, action: 'FLEET_MAINTENANCE_CREATE', entity: 'VehicleMaintenance', entityId: String(record._id),
      newValues: { vehicleId: String(body.vehicleId), maintenanceType: body.maintenanceType, scheduledDate: record.scheduledDate?.toISOString() },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return record;
  }

  static async updateMaintenance(id: string, body: any, userId: string, auditCtx?: AuditCtx) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid maintenance ID: "${id}"`);
    return payrollTransaction(async () => {
      const record = await VehicleMaintenance.findById(id);
      if (!record) throw ApiError.notFound('Maintenance record not found');
      const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
      if (body.status !== undefined) {
        if (!Object.values(MaintenanceStatus).includes(body.status)) throw ApiError.badRequest('status is not a valid maintenance status.');
        before.status = record.status; after.status = body.status;
        record.status = body.status;
        if (body.status === MaintenanceStatus.COMPLETED) {
          record.completedDate = body.completedDate ? new Date(body.completedDate) : new Date();
          if (body.odometerAtService != null) {
            if (!Number.isFinite(Number(body.odometerAtService)) || Number(body.odometerAtService) < 0) throw ApiError.badRequest('odometerAtService is invalid.');
            record.odometerAtService = Number(body.odometerAtService);
            await Vehicle.findByIdAndUpdate(record.vehicleId, { $set: { currentOdometer: Math.max(record.odometerAtService, 0) } });
          }
        }
      }
      if (body.scheduledDate !== undefined) { before.scheduledDate = record.scheduledDate; record.scheduledDate = body.scheduledDate ? new Date(body.scheduledDate) : undefined; after.scheduledDate = record.scheduledDate; }
      if (body.description !== undefined) record.description = String(body.description).trim();
      if (body.serviceCenter !== undefined) record.serviceCenter = String(body.serviceCenter).trim();
      await record.save();
      await AuditService.log({ userId, action: 'FLEET_MAINTENANCE_UPDATE', entity: 'VehicleMaintenance', entityId: id, oldValues: before, newValues: after,
        ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
      return record;
    });
  }

  // ── Vehicle documents + expiry notifications ───────────────────────

  static async listDocuments(vehicleId: string) {
    if (!Types.ObjectId.isValid(vehicleId)) throw ApiError.badRequest('vehicleId is required.');
    return VehicleDocument.find({ vehicleId }).sort({ expiryDate: 1 });
  }

  static async createDocument(body: any, userId: string, auditCtx?: AuditCtx) {
    if (!body?.vehicleId || !Types.ObjectId.isValid(String(body.vehicleId))) throw ApiError.badRequest('vehicleId is required.');
    if (!body?.documentType?.trim()) throw ApiError.badRequest('documentType is required.');
    if (!body?.fileName?.trim()) throw ApiError.badRequest('fileName is required.');
    if (!body?.fileUrl?.trim()) throw ApiError.badRequest('fileUrl is required (upload via /api/files first).');
    if (body?.expiryDate) { const d = new Date(body.expiryDate); if (isNaN(d.getTime())) throw ApiError.badRequest('expiryDate is not a valid date.'); }
    const vehicle = await Vehicle.findById(body.vehicleId).lean();
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    const doc = await VehicleDocument.create({
      vehicleId: body.vehicleId, documentType: body.documentType.trim(),
      fileName: body.fileName.trim(), fileUrl: body.fileUrl.trim(),
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : undefined,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      uploadedBy: userId,
    });
    await AuditService.log({ userId, action: 'FLEET_DOCUMENT_CREATE', entity: 'VehicleDocument', entityId: String(doc._id),
      newValues: { vehicleId: String(body.vehicleId), documentType: doc.documentType, expiryDate: doc.expiryDate?.toISOString() },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return doc;
  }

  static async deleteDocument(id: string, userId: string, auditCtx?: AuditCtx) {
    if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest(`Invalid document ID: "${id}"`);
    const doc = await VehicleDocument.findById(id);
    if (!doc) throw ApiError.notFound('Vehicle document not found');
    await doc.deleteOne();
    await AuditService.log({ userId, action: 'FLEET_DOCUMENT_DELETE', entity: 'VehicleDocument', entityId: id,
      oldValues: { documentType: doc.documentType, expiryDate: doc.expiryDate?.toISOString() },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua });
    return { deleted: true };
  }

  /**
   * Scan all vehicle documents for expiry within the notice window and raise
   * one notification per recipient (duplicate-safe: idempotent per run).
   */
  static async scanDocumentExpiry(userId: string, noticeDays = 30) {
    const soon = new Date();
    soon.setDate(soon.getDate() + noticeDays);
    const expiring = await VehicleDocument.find({ expiryDate: { $lte: soon, $ne: null } }).populate('vehicleId', 'plateNumber make model');
    if (!expiring.length) return { notified: 0, expiring: [] };
    const admins = await User.find({ $or: [{ role: 'SUPER_ADMIN' }, { role: 'SYSTEM_ADMIN' }] }).select('_id').lean();
    if (!admins.length) return { notified: 0, expiring: expiring.map((d) => ({ id: String(d._id), documentType: d.documentType })) };
    const existingLinks = new Set((await Notification.find({ link: { $regex: '/fleet' } }).select('title createdAt').lean()).map((n) => `${n.title}`));
    let created = 0;
    for (const doc of expiring) {
      const v: any = doc.vehicleId;
      const title = `Fleet document expiring: ${v?.plateNumber || 'vehicle'} · ${doc.documentType}`;
      if (existingLinks.has(title)) continue;
      const message = doc.expiryDate
        ? `Document "${doc.documentType}" on ${v?.plateNumber || 'vehicle'} expires on ${doc.expiryDate.toISOString().slice(0, 10)}. Renew before expiry.`
        : `Document "${doc.documentType}" on ${v?.plateNumber || 'vehicle'} has no expiry set — please review.`;
      await Notification.insertMany(admins.map((a) => ({ userId: a._id, title, message, type: 'WARNING', link: '/fleet' })));
      created += admins.length;
    }
    await AuditService.log({ userId, action: 'FLEET_DOCUMENT_EXPIRY_SCAN', entity: 'VehicleDocument', newValues: { checked: expiring.length, notified: created }, });
    return { notified: created, expiring: expiring.map((d: any) => ({ id: String(d._id), documentType: d.documentType, expiryDate: d.expiryDate, plateNumber: d.vehicleId?.plateNumber })) };
  }
}
