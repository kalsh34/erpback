"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceLibraryController = void 0;
const serviceLibrary_service_1 = require("./serviceLibrary.service");
class ServiceLibraryController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, search, category, pricingModel, active, sort, dir } = req.query;
            const result = await serviceLibrary_service_1.ServiceLibraryService.getAll({
                page: page ? parseInt(page, 10) : undefined,
                limit: limit ? parseInt(limit, 10) : undefined,
                search: search,
                category: category,
                pricingModel: pricingModel,
                active: active,
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
            const result = await serviceLibrary_service_1.ServiceLibraryService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await serviceLibrary_service_1.ServiceLibraryService.create(req.body, {
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
            const result = await serviceLibrary_service_1.ServiceLibraryService.update(req.params.id, req.body, {
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
    static async deactivate(req, res, next) {
        try {
            const result = await serviceLibrary_service_1.ServiceLibraryService.deactivate(req.params.id, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
    static async reactivate(req, res, next) {
        try {
            const result = await serviceLibrary_service_1.ServiceLibraryService.reactivate(req.params.id, {
                userId: req.user?.userId,
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ServiceLibraryController = ServiceLibraryController;
//# sourceMappingURL=serviceLibrary.controller.js.map