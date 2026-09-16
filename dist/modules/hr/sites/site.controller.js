"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SiteController = void 0;
const site_service_1 = require("./site.service");
class SiteController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, search } = req.query;
            const result = await site_service_1.SiteService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                status: status,
                search: search,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const site = await site_service_1.SiteService.getById(req.params.id);
            res.json({ success: true, data: site });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const site = await site_service_1.SiteService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: site });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const site = await site_service_1.SiteService.update(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: site });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await site_service_1.SiteService.delete(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Site deleted' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SiteController = SiteController;
//# sourceMappingURL=site.controller.js.map