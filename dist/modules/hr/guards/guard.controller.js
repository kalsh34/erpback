"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardController = void 0;
const guard_service_1 = require("./guard.service");
class GuardController {
    static async registerGuard(req, res, next) {
        try {
            const result = await guard_service_1.GuardService.registerGuard(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async assignSite(req, res, next) {
        try {
            const assignment = await guard_service_1.GuardService.assignSite(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: assignment });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuardSites(req, res, next) {
        try {
            const sites = await guard_service_1.GuardService.getGuardSites(req.params.guardId);
            res.json({ success: true, data: sites });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeSiteAssignment(req, res, next) {
        try {
            const assignment = await guard_service_1.GuardService.removeSiteAssignment(req.params.assignmentId, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: assignment });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAllGuards(req, res, next) {
        try {
            const guards = await guard_service_1.GuardService.getAllGuards();
            res.json({ success: true, data: guards });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuardDetail(req, res, next) {
        try {
            const detail = await guard_service_1.GuardService.getGuardDetail(req.params.employeeId);
            res.json({ success: true, data: detail });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateGuard(req, res, next) {
        try {
            const guard = await guard_service_1.GuardService.updateGuard(req.params.employeeId, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: guard });
        }
        catch (error) {
            next(error);
        }
    }
    static async updatePayRate(req, res, next) {
        try {
            const assignment = await guard_service_1.GuardService.updateGuardPayRate(req.params.assignmentId, req.body.hourlyRate, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: assignment });
        }
        catch (error) {
            next(error);
        }
    }
    static async setHomeSite(req, res, next) {
        try {
            const employee = await guard_service_1.GuardService.setHomeSite(req.params.employeeId, req.body.homeSiteId, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: employee });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.GuardController = GuardController;
//# sourceMappingURL=guard.controller.js.map