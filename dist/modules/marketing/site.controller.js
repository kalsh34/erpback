"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaSiteController = void 0;
const site_service_1 = require("./site.service");
function ctx(req) {
    return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}
class ProformaSiteController {
    static async getAll(req, res, next) {
        try {
            const result = await site_service_1.ProformaSiteService.getAll({
                companyId: req.query.companyId,
                search: req.query.search,
                status: req.query.status,
                activeOnly: req.query.activeOnly,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await site_service_1.ProformaSiteService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await site_service_1.ProformaSiteService.create(req.body, ctx(req));
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await site_service_1.ProformaSiteService.update(req.params.id, req.body, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProformaSiteController = ProformaSiteController;
//# sourceMappingURL=site.controller.js.map