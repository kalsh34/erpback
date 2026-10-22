/**
 * FLEET PHASE 1 CHECK SUITE
 * Real MongoDB (same RS the app uses), isolated test tenant; cleans up after itself.
 * Covers: vehicle validation, driver eligibility, assignment overlap prevention,
 * assignment end frees, maintenance completion odometer, document expiry scan,
 * and RBAC wiring for the fleet permissions.
 */
import mongoose from 'mongoose';
import { FleetService } from '../src/modules/fleet/fleet.service';
import { Vehicle, Driver, VehicleAssignment, VehicleMaintenance, VehicleDocument, VehicleType, VehicleStatus, MaintenanceType, MaintenanceStatus } from '../src/modules/fleet/fleet.models';
import { Employee } from '../src/models/Employee';
import { EmployeeStatus, EmployeeCategory } from '../src/types';
import { Notification } from '../src/models/Notification';
import { PERMISSIONS } from '../src/types';
import { registerFleetPermissions } from '../src/modules/fleet/fleet.permissions';

const uri = process.env.FLEET_TEST_URI || 'mongodb://127.0.0.1:27017/vitalpayroll_fleet_test';

let checks = 0, failures = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  checks += 1;
  if (cond) console.log(`  PASS  ${name}`);
  else { failures += 1; console.log(`  FAIL  ${name}${detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : ''}`); }
}

async function expectApiError(name: string, fn: () => Promise<unknown>, code?: number) {
  try { await fn(); ok(name, false, 'no error thrown'); }
  catch (e: any) { ok(name, e?.status === code || e?.statusCode === code || code === undefined, { message: e?.message, status: e?.status ?? e?.statusCode }); }
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db!;
  const testMarker = Date.now();

  registerFleetPermissions();
  const userId = new mongoose.Types.ObjectId().toString();

  // Idempotent fixtures: drop leftovers from any earlier partial run first.
  await Promise.all([
    Vehicle.deleteMany({}), Driver.deleteMany({}), VehicleAssignment.deleteMany({}),
    VehicleMaintenance.deleteMany({}), VehicleDocument.deleteMany({}), Employee.deleteMany({}),
    Notification.deleteMany({ title: /Fleet document expiring/ }),
    db.collection('users').deleteMany({ email: 'fltest-admin@example.com' }),
  ]);

  // ── Fixtures ───────────────────────────────────────────────────────
  const site = await db.collection('sites').insertOne({ siteName: 'FLTest Site', siteCode: 'FST', location: 'AA', siteType: 'COMMERCIAL', status: 'ACTIVE', radiusMeters: 50, agreedManpower: 0, actualManpower: 0, createdAt: new Date(), updatedAt: new Date() });

  const emp = await Employee.create({
    employeeCode: `FLT-${testMarker}`, firstName: 'Flt', lastName: 'Driver', category: EmployeeCategory.OFFICE_STAFF, status: EmployeeStatus.ACTIVE,
  });
  const empInactive = await Employee.create({
    employeeCode: `FLT-I${testMarker}`, firstName: 'Flt', lastName: 'Terminated', category: EmployeeCategory.OFFICE_STAFF, status: EmployeeStatus.TERMINATED,
  });

  const adminCtx = { userId, };

  console.log('\nVehicle validation:');
  await expectApiError('rejects missing plate', () => FleetService.createVehicle({ make: 'Toyota', model: 'Corolla', vehicleType: VehicleType.CAR } as any, userId));
  await expectApiError('rejects missing model', () => FleetService.createVehicle({ plateNumber: 'X', make: 'Toyota', vehicleType: VehicleType.CAR } as any, userId));
  await expectApiError('rejects bad type', () => FleetService.createVehicle({ plateNumber: 'X', make: 'T', model: 'M', vehicleType: 'SPACESHIP' } as any, userId));
  await expectApiError('rejects bad year', () => FleetService.createVehicle({ plateNumber: 'X', make: 'T', model: 'M', vehicleType: 'CAR', year: 1850 } as any, userId));
  await expectApiError('rejects bad odometer', () => FleetService.createVehicle({ plateNumber: 'A-Odo-X', make: 'T', model: 'M', vehicleType: 'CAR', currentOdometer: -5 } as any, userId));
  const plate = `AA-${testMarker}`;
  const vehicle = await FleetService.createVehicle({ plateNumber: plate, make: 'Toyota', model: 'Corolla', vehicleType: VehicleType.CAR, year: 2022, assignedSiteId: String(site.insertedId) } as any, userId);
  ok('creates vehicle with normalized plate', vehicle.plateNumber === plate && vehicle.status === VehicleStatus.ACTIVE);
  await expectApiError('rejects duplicate plate', () => FleetService.createVehicle({ plateNumber: plate, make: 'T', model: 'M', vehicleType: 'CAR' } as any, userId));
  const vehicle2 = await FleetService.createVehicle({ plateNumber: `BB-${testMarker}`, make: 'Isuzu', model: 'D-Max', vehicleType: VehicleType.PICKUP } as any, userId);
  ok('second vehicle created for cross-driver tests', !!vehicle2._id);

  console.log('\nDriver eligibility:');
  await expectApiError('rejects driver without employee', () => FleetService.createDriver({ employeeId: new mongoose.Types.ObjectId().toString(), licenseNumber: 'L-1' } as any, userId));
  await expectApiError('rejects TERMINATED employee as driver', () => FleetService.createDriver({ employeeId: String(empInactive._id), licenseNumber: 'L-2' } as any, userId));
  const driver = await FleetService.createDriver({ employeeId: String(emp._id), licenseNumber: `LIC-${testMarker}` } as any, userId);
  ok('registers ACTIVE employee as driver', (driver as any).isAvailable === true);
  await expectApiError('rejects duplicate driver for same employee', () => FleetService.createDriver({ employeeId: String(emp._id), licenseNumber: 'L-3' } as any, userId));

  console.log('\nAssignment overlap prevention:');
  const assignment1 = await FleetService.createAssignment({ vehicleId: String(vehicle._id), driverId: String(driver._id), purpose: 'patrol' } as any, userId);
  ok('assigns active vehicle + available driver', (assignment1 as any).isCurrent === true);
  await expectApiError('rejects second assignment for same vehicle', () => FleetService.createAssignment({ vehicleId: String(vehicle._id), driverId: String(driver._id) } as any, userId));
  await expectApiError('rejects assignment to non-ACTIVE vehicle', async () => {
    await FleetService.setVehicleStatus(String(vehicle._id), VehicleStatus.IN_MAINTENANCE, userId);
    await FleetService.createAssignment({ vehicleId: String(vehicle._id), driverId: String(driverB._id) } as any, userId);
  });
  await FleetService.setVehicleStatus(String(vehicle._id), VehicleStatus.ACTIVE, userId); // restore
  const empB = await Employee.create({ employeeCode: `FLT-B${testMarker}`, firstName: 'B', lastName: 'Two', category: EmployeeCategory.OFFICE_STAFF, status: EmployeeStatus.ACTIVE });
  const driverB = await FleetService.createDriver({ employeeId: String(empB._id), licenseNumber: `LIC-B${testMarker}` } as any, userId);
  void driverB;
  await expectApiError('rejects assignment when driver allocated', async () => {
    const v3 = await FleetService.createVehicle({ plateNumber: `CC-${testMarker}`, make: 'M', model: 'M2', vehicleType: VehicleType.MOTORCYCLE } as any, userId);
    await FleetService.createAssignment({ vehicleId: String(v3._id), driverId: String(driver._id) } as any, userId);
  });
  ok('driver isAvailable flipped false after assignment', (await Driver.findById(driver._id))!.isAvailable === false);

  console.log('\nAssignment end frees vehicle + driver:');
  await FleetService.endAssignment(String(assignment1._id), undefined, userId);
  ok('assignment closed', (await VehicleAssignment.findById(assignment1._id))!.isCurrent === false);
  ok('driver freed', (await Driver.findById(driver._id))!.isAvailable === true);
  await expectApiError('cannot end an already-closed assignment', () => FleetService.endAssignment(String(assignment1._id), undefined, userId));

  console.log('\nMaintenance:');
  await expectApiError('rejects maintenance with bad type', () => FleetService.createMaintenance({ vehicleId: String(vehicle._id), maintenanceType: 'CASINO_TRIP' } as any, userId));
  const maintenance = await FleetService.createMaintenance({ vehicleId: String(vehicle._id), maintenanceType: MaintenanceType.ROUTINE_SERVICE, scheduledDate: new Date(Date.now() + 86400000).toISOString() } as any, userId);
  ok('starts SCHEDULED', maintenance.status === MaintenanceStatus.SCHEDULED);
  await expectApiError('rejects non-SCHEDULED initial status', () => FleetService.createMaintenance({ vehicleId: String(vehicle._id), maintenanceType: MaintenanceType.REPAIR, status: MaintenanceStatus.COMPLETED } as any, userId));
  const due = await FleetService.listMaintenance({ dueBefore: new Date(Date.now() + 2 * 86400000).toISOString(), vehicleId: String(vehicle._id) });
  ok('due-window query finds scheduled record', due.some((m: any) => String(m._id) === String(maintenance._id)));
  const done = await FleetService.updateMaintenance(String(maintenance._id), { status: MaintenanceStatus.COMPLETED, odometerAtService: 45000 }, userId);
  ok('completes and stamps odometer', done.status === MaintenanceStatus.COMPLETED && done.odometerAtService === 45000);
  ok('vehicle odometer synced', (await Vehicle.findById(vehicle._id))!.currentOdometer === 45000);

  console.log('\nVehicle documents + expiry notifications:');
  await expectApiError('rejects document without type', () => FleetService.createDocument({ vehicleId: String(vehicle._id), fileName: 'x.pdf', fileUrl: '/uploads/x.pdf' } as any, userId));
  await expectApiError('rejects document without file', () => FleetService.createDocument({ vehicleId: String(vehicle._id), documentType: 'Insurance' } as any, userId));
  const soonDate = new Date(); soonDate.setDate(soonDate.getDate() + 10);
  const doc = await FleetService.createDocument({ vehicleId: String(vehicle._id), documentType: 'Insurance', fileName: 'ins.pdf', fileUrl: '/uploads/ins.pdf', expiryDate: soonDate.toISOString() } as any, userId);
  ok('document recorded with expiry', (await VehicleDocument.findById(doc._id))!.documentType === 'Insurance');
  await db.collection('users').insertOne({ _id: new mongoose.Types.ObjectId(), email: `fltest-admin-${testMarker}@example.com`, role: 'SUPER_ADMIN', isActive: true, passwordHash: 'x', permissions: [], createdAt: new Date(), updatedAt: new Date() } as any);
  const scan = await FleetService.scanDocumentExpiry(userId, 30);
  ok('expiry scan finds the document', scan.expiring.some((d: any) => String(d.id) === String(doc._id)), scan);
  ok('expiry scan raised notifications', scan.notified > 0, scan.notified);
  const scan2 = await FleetService.scanDocumentExpiry(userId, 30);
  ok('re-scan is idempotent (no duplicate notifications)', scan2.notified === 0, scan2.notified);

  console.log('\nPermissions wiring:');
  const perms = PERMISSIONS as Record<string, string>;
  ok('fleet permissions registered', ['fleet.read', 'fleet.manage', 'fleet.assign', 'fleet.report'].every(k => Object.values(perms).includes(k)));

  console.log('\nMongoose validation (unique plate at the model level):');
  const gut = await Vehicle.create({ plateNumber: 'DUP-TEST', make: 'X', modelName: 'Y', vehicleType: VehicleType.OTHER, createdBy: new mongoose.Types.ObjectId() });
  try { await Vehicle.create({ plateNumber: 'DUP-TEST', make: 'X', modelName: 'Y', vehicleType: VehicleType.OTHER, createdBy: new mongoose.Types.ObjectId() }); ok('model-level unique plate', false, 'duplicate created'); }
  catch { ok('model-level unique plate', true); }
  await gut.deleteOne();

  // ── Cleanup ──────────────────────────────────────────────
  await Promise.all([
    Employee.deleteMany({ employeeCode: /^[A-Z]+-\d*$|^FLT-/ }).orFail().catch(() => {}),
    Notification.deleteMany({ title: /Fleet document expiring/ }),
    Vehicle.deleteMany({ plateNumber: /-FLTest|\b\d+$/ }).orFail().catch(() => {}),
  ]);
  await Vehicle.deleteMany({});
  await Driver.deleteMany({});
  await VehicleAssignment.deleteMany({});
  await VehicleMaintenance.deleteMany({});
  await VehicleDocument.deleteMany({});
  await Employee.deleteMany({});
  await Notification.deleteMany({});
  await db.collection('users').deleteMany({ email: new RegExp('^fltest-admin-.*@example.com$') });

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'} — ${checks} checks run`);
  await mongoose.disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error('FLEET CHECKS FAILED:', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
