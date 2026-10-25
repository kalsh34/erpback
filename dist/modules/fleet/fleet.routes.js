"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fleet_controller_1 = require("./fleet.controller");
const auth_1 = require("../../middleware/auth");
const rbac_1 = require("../../middleware/rbac");
const types_1 = require("../../types");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
const READ = types_1.PERMISSIONS.FLEET_READ;
const MANAGE = types_1.PERMISSIONS.FLEET_MANAGE;
const ASSIGN = types_1.PERMISSIONS.FLEET_ASSIGN;
// Vehicles
router.get('/vehicles', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.listVehicles);
router.get('/vehicles/:id', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.getVehicle);
router.post('/vehicles', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.createVehicle);
router.put('/vehicles/:id', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.updateVehicle);
router.patch('/vehicles/:id/status', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.setVehicleStatus);
// Drivers (linked to Employees — no duplicate identity system)
router.get('/drivers', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.listDrivers);
router.post('/drivers', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.createDriver);
router.put('/drivers/:id', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.updateDriver);
// Assignments (effective-dated, overlap-safe)
router.get('/assignments', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.listAssignments);
router.post('/assignments', (0, rbac_1.authorize)(ASSIGN), fleet_controller_1.FleetController.createAssignment);
router.post('/assignments/:id/end', (0, rbac_1.authorize)(ASSIGN), fleet_controller_1.FleetController.endAssignment);
// Maintenance
router.get('/maintenance', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.listMaintenance);
router.post('/maintenance', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.createMaintenance);
router.put('/maintenance/:id', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.updateMaintenance);
// Vehicle documents (files uploaded through the existing /api/files flow)
router.get('/vehicles/:vehicleId/documents', (0, rbac_1.authorize)(READ), fleet_controller_1.FleetController.listDocuments);
router.post('/documents', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.createDocument);
router.delete('/documents/:id', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.deleteDocument);
// Expiry notification scan (idempotent; raises WARNING notifications to admins)
router.post('/documents/scan-expiry', (0, rbac_1.authorize)(MANAGE), fleet_controller_1.FleetController.scanExpiry);
exports.default = router;
//# sourceMappingURL=fleet.routes.js.map