"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShiftScheduleController = void 0;
const shiftSchedule_service_1 = require("./shiftSchedule.service");
class ShiftScheduleController {
    static async getAll(req, res, next) {
        try {
            const { status, search, siteId } = req.query;
            const result = await shiftSchedule_service_1.ShiftScheduleService.getAll({
                status: status, search: search, siteId: siteId,
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.create(req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.update(req.params.id, req.body, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await shiftSchedule_service_1.ShiftScheduleService.delete(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, message: 'Shift schedule deleted' });
        }
        catch (error) {
            next(error);
        }
    }
    static async addGuards(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.addGuards(req.params.id, req.body.guardIds || [], req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeGuard(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.removeGuard(req.params.id, req.params.guardId, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async reorderPool(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.reorderPool(req.params.id, req.body.orderedGuardIds || [], req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async addFloaters(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.addFloaters(req.params.id, req.body.guardIds || [], req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async removeFloater(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.removeFloater(req.params.id, req.params.guardId, req.user?.userId || '');
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async preview(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const result = await shiftSchedule_service_1.ShiftScheduleService.preview(req.params.id, startDate, endDate);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async generate(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.generate(req.params.id, { startDate: req.body.startDate, endDate: req.body.endDate, overwrite: req.body.overwrite }, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAssignments(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const result = await shiftSchedule_service_1.ShiftScheduleService.getAssignments(req.params.id, startDate, endDate);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async clearAssignments(req, res, next) {
        try {
            const result = await shiftSchedule_service_1.ShiftScheduleService.clearAssignments(req.params.id, req.user?.userId || '', { ip: req.ip, ua: req.get('user-agent') });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getGuardCommitments(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const result = await shiftSchedule_service_1.ShiftScheduleService.getGuardCommitments(req.params.id, startDate, endDate);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ShiftScheduleController = ShiftScheduleController;
//# sourceMappingURL=shiftSchedule.controller.js.map