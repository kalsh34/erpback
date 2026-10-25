"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RFQController = void 0;
const rfq_service_1 = require("./rfq.service");
class RFQController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, supplierId, buyerId, search, sort, dir } = req.query;
            const result = await rfq_service_1.RFQService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                status: status,
                supplierId: supplierId,
                buyerId: buyerId,
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
            const result = await rfq_service_1.RFQService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await rfq_service_1.RFQService.create(req.body, {
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
            const result = await rfq_service_1.RFQService.update(req.params.id, req.body, {
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
            const result = await rfq_service_1.RFQService.submit(req.params.id, {
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
    static async send(req, res, next) {
        try {
            const result = await rfq_service_1.RFQService.send(req.params.id, {
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
    static async recordQuotation(req, res, next) {
        try {
            const { quotes } = req.body;
            const result = await rfq_service_1.RFQService.recordQuotation(req.params.id, quotes || [], {
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
            const result = await rfq_service_1.RFQService.approve(req.params.id, {
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
    static async reject(req, res, next) {
        try {
            const { reason } = req.body;
            const result = await rfq_service_1.RFQService.reject(req.params.id, reason || 'Rejected by buyer', {
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
    static async convertToPO(req, res, next) {
        try {
            const result = await rfq_service_1.RFQService.convertToPO(req.params.id, req.body, {
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
    static async compare(req, res, next) {
        try {
            const result = await rfq_service_1.RFQService.compareQuotations();
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.RFQController = RFQController;
//# sourceMappingURL=rfq.controller.js.map