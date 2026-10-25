"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const contact_service_1 = require("./contact.service");
class ContactController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, search, isSupplier, isCustomer, category, status, sort, dir } = req.query;
            const result = await contact_service_1.ContactService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                search: search,
                isSupplier: isSupplier,
                isCustomer: isCustomer,
                category: category,
                status: status,
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
            const result = await contact_service_1.ContactService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await contact_service_1.ContactService.create(req.body, {
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
            const result = await contact_service_1.ContactService.update(req.params.id, req.body, {
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
    static async delete(req, res, next) {
        try {
            const result = await contact_service_1.ContactService.delete(req.params.id, {
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
exports.ContactController = ContactController;
//# sourceMappingURL=contact.controller.js.map