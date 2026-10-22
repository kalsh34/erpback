import { Router } from 'express';
import { FleetController } from './fleet.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

const READ = PERMISSIONS.FLEET_READ;
const MANAGE = PERMISSIONS.FLEET_MANAGE;
const ASSIGN = PERMISSIONS.FLEET_ASSIGN;

// Vehicles
router.get('/vehicles', authorize(READ), FleetController.listVehicles);
router.get('/vehicles/:id', authorize(READ), FleetController.getVehicle);
router.post('/vehicles', authorize(MANAGE), FleetController.createVehicle);
router.put('/vehicles/:id', authorize(MANAGE), FleetController.updateVehicle);
router.patch('/vehicles/:id/status', authorize(MANAGE), FleetController.setVehicleStatus);

// Drivers (linked to Employees — no duplicate identity system)
router.get('/drivers', authorize(READ), FleetController.listDrivers);
router.post('/drivers', authorize(MANAGE), FleetController.createDriver);
router.put('/drivers/:id', authorize(MANAGE), FleetController.updateDriver);

// Assignments (effective-dated, overlap-safe)
router.get('/assignments', authorize(READ), FleetController.listAssignments);
router.post('/assignments', authorize(ASSIGN), FleetController.createAssignment);
router.post('/assignments/:id/end', authorize(ASSIGN), FleetController.endAssignment);

// Maintenance
router.get('/maintenance', authorize(READ), FleetController.listMaintenance);
router.post('/maintenance', authorize(MANAGE), FleetController.createMaintenance);
router.put('/maintenance/:id', authorize(MANAGE), FleetController.updateMaintenance);

// Vehicle documents (files uploaded through the existing /api/files flow)
router.get('/vehicles/:vehicleId/documents', authorize(READ), FleetController.listDocuments);
router.post('/documents', authorize(MANAGE), FleetController.createDocument);
router.delete('/documents/:id', authorize(MANAGE), FleetController.deleteDocument);

// Expiry notification scan (idempotent; raises WARNING notifications to admins)
router.post('/documents/scan-expiry', authorize(MANAGE), FleetController.scanExpiry);

export default router;
