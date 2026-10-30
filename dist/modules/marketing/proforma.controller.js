"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaController = void 0;
const proforma_service_1 = require("./proforma.service");
function ctx(req) {
    return {
        userId: req.user?.userId,
        ip: req.ip,
        ua: req.get('user-agent'),
        // Effective per-user permissions (attached by authenticate()). The
        // service uses these for conditional checks the route gate cannot express
        // — e.g. line-discount changes additionally require PROFORMA_DISCOUNT.
        permissions: req.user?.permissions ?? [],
    };
}
class ProformaController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, search, status, companyId, sort, dir } = req.query;
            const result = await proforma_service_1.ProformaService.getAll({
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                search: search,
                status: status,
                companyId: companyId,
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
            res.json({ success: true, data: result.proforma, superseded: result.superseded ?? null });
        }
        catch (error) {
            next(error);
        }
    }
    static async void(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.void_(req.params.id, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async amend(req, res, next) {
        try {
            const result = await proforma_service_1.ProformaService.amend(req.params.id, ctx(req));
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProformaController = ProformaController;
//# sourceMappingURL=proforma.controller.js.map