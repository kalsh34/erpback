"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillController = void 0;
const bill_service_1 = require("./bill.service");
class BillController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, supplierId, purchaseOrderId, search, sort, dir } = req.query;
            const result = await bill_service_1.BillService.getAll({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                status: status,
                supplierId: supplierId,
                purchaseOrderId: purchaseOrderId,
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
            const result = await bill_service_1.BillService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await bill_service_1.BillService.create(req.body, {
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
    static async postBill(req, res, next) {
        try {
            const result = await bill_service_1.BillService.postBill(req.params.id, {
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
    static async recordPayment(req, res, next) {
        try {
            const result = await bill_service_1.BillService.recordPayment(req.params.id, req.body, {
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
exports.BillController = BillController;
//# sourceMappingURL=bill.controller.js.map