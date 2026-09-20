"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RotationController = void 0;
const rotation_service_1 = require("./rotation.service");
class RotationController {
    static async create(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.create(req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAll(req, res, next) {
        try {
            const { status, search } = req.query;
            const result = await rotation_service_1.RotationService.getAll({ status: status, search: search });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.update(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await rotation_service_1.RotationService.delete(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, message: 'Rotation deleted' });
        }
        catch (error) {
            next(error);
        }
    }
    static async addGuards(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.addGuards(req.params.id, req.body.guardIds || [], req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeGuard(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.removeGuard(req.params.id, req.params.guardId, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async reorderPool(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.reorderPool(req.params.id, req.body.orderedGuardIds || [], req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async addFloaters(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.addFloaters(req.params.id, req.body.guardIds || [], req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeFloater(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.removeFloater(req.params.id, req.params.guardId, req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async checkFairness(req, res, next) {
        try {
            const { poolSize, slotCount } = req.query;
            const result = rotation_service_1.RotationService.checkFairness(parseInt(poolSize) || 0, parseInt(slotCount) || 0);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async preview(req, res, next) {
        try {
            const days = parseInt(req.query.days) || 14;
            const result = await rotation_service_1.RotationService.preview(req.params.id, days);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async generate(req, res, next) {
        try {
            const days = parseInt(req.body.days) || 14;
            const result = await rotation_service_1.RotationService.generate(req.params.id, days, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAssignments(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const result = await rotation_service_1.RotationService.getAssignments(req.params.id, startDate, endDate);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async rotateAssignments(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.rotateAssignments(req.params.id, req.body.date || req.query.date);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async activate(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.activate(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async pause(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.pause(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async archive(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.archive(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async suggestLeaveCoverA(req, res, next) {
        try {
            const { guardId, date } = req.query;
            const result = await rotation_service_1.RotationService.suggestLeaveCoverA(req.params.id, guardId, new Date(date));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async suggestLeaveCoverB(req, res, next) {
        try {
            const { date } = req.query;
            const result = await rotation_service_1.RotationService.suggestLeaveCoverB(req.params.id, new Date(date));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async applyLeaveCoverage(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.applyLeaveCoverage(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancelLeaveCoverage(req, res, next) {
        try {
            const result = await rotation_service_1.RotationService.cancelLeaveCoverage(req.params.id, req.body.guardId, new Date(req.body.startDate), req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RotationController = RotationController;
//# sourceMappingURL=rotation.controller.js.map