"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptController = void 0;
const receipt_service_1 = require("./receipt.service");
class ReceiptController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, purchaseOrderId, supplierId, warehouse, search, sort, dir } = req.query;
            const result = await receipt_service_1.ReceiptService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                purchaseOrderId: purchaseOrderId,
                supplierId: supplierId,
                warehouse: warehouse,
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
            const result = await receipt_service_1.ReceiptService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await receipt_service_1.ReceiptService.create(req.body, {
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
}
exports.ReceiptController = ReceiptController;
//# sourceMappingURL=receipt.controller.js.map