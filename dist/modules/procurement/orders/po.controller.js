"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POController = void 0;
const po_service_1 = require("./po.service");
class POController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, supplierId, buyerId, department, search, sort, dir } = req.query;
            const result = await po_service_1.POService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                status: status,
                supplierId: supplierId,
                buyerId: buyerId,
                department: department,
                search: search,
                sort: sort,
                dir: dir,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await po_service_1.POService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await po_service_1.POService.create(req.body, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await po_service_1.POService.update(req.params.id, req.body, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async submit(req, res, next) {
        try {
            const result = await po_service_1.POService.submit(req.params.id, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async approve(req, res, next) {
        try {
            const { comments } = req.body;
            const result = await po_service_1.POService.approve(req.params.id, comments, {
                userId: req.user?.userId,
                userRole: req.user?.role,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async reject(req, res, next) {
        try {
            const { comments } = req.body;
            const result = await po_service_1.POService.reject(req.params.id, comments || 'Rejected by approver', {
                userId: req.user?.userId,
                userRole: req.user?.role,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async send(req, res, next) {
        try {
            const result = await po_service_1.POService.send(req.params.id, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async revise(req, res, next) {
        try {
            const result = await po_service_1.POService.revise(req.params.id, req.body, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.POController = POController;
//# sourceMappingURL=po.controller.js.map