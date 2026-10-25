"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const product_service_1 = require("./product.service");
class ProductController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, search, type, category, supplierId, lowStock, status, sort, dir } = req.query;
            const result = await product_service_1.ProductService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                search: search,
                type: type,
                category: category,
                supplierId: supplierId,
                lowStock: lowStock,
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
            const result = await product_service_1.ProductService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await product_service_1.ProductService.create(req.body, {
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
            const result = await product_service_1.ProductService.update(req.params.id, req.body, {
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
            const result = await product_service_1.ProductService.delete(req.params.id, {
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
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map