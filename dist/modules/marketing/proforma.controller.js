"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaController = void 0;
const proforma_service_1 = require("./proforma.service");
function ctx(req) {
    return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}
class ProformaController {
    static async getAll(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.getAll({
                page: req.query.page ? parseInt(req.query.page, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
                search: req.query.search,
                status: req.query.status,
                companyId: req.query.companyId,
                from: req.query.from,
                to: req.query.to,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.create(req.body, ctx(req));
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.update(req.params.id, req.body, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async issue(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.issue(req.params.id, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async setStatus(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.setStatus(req.params.id, req.body?.status, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProformaController = ProformaController;
//# sourceMappingURL=proforma.controller.js.map