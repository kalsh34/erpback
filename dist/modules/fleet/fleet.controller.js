"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetController = void 0;
const fleet_service_1 = require("./fleet.service");
const auditCtx = (req) => ({ ip: req.ip, ua: req.get('user-agent') });
const userId = (req) => req.user?.userId || '';
class FleetController {
    static async listVehicles(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.listVehicles(req.query) });
        }
        catch (error) {
            next(error);
        }
    }
    static async getVehicle(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.getVehicle(req.params.id) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createVehicle(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await fleet_service_1.FleetService.createVehicle(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateVehicle(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.updateVehicle(req.params.id, req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async setVehicleStatus(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.setVehicleStatus(req.params.id, req.body?.status, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listDrivers(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.listDrivers(req.query) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createDriver(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await fleet_service_1.FleetService.createDriver(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateDriver(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.updateDriver(req.params.id, req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listAssignments(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.listAssignments(req.query) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createAssignment(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await fleet_service_1.FleetService.createAssignment(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async endAssignment(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.endAssignment(req.params.id, req.body?.effectiveTo, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listMaintenance(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.listMaintenance(req.query) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createMaintenance(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await fleet_service_1.FleetService.createMaintenance(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateMaintenance(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.updateMaintenance(req.params.id, req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async listDocuments(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.listDocuments(req.params.vehicleId) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createDocument(req, res, next) {
        try {
            res.status(201).json({ success: true, data: await fleet_service_1.FleetService.createDocument(req.body, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteDocument(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.deleteDocument(req.params.id, userId(req), auditCtx(req)) });
        }
        catch (error) {
            next(error);
        }
    }
    static async scanExpiry(req, res, next) {
        try {
            res.json({ success: true, data: await fleet_service_1.FleetService.scanDocumentExpiry(userId(req)) });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FleetController = FleetController;
//# sourceMappingURL=fleet.controller.js.map