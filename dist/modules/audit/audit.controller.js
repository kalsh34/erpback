"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const audit_service_1 = require("./audit.service");
class AuditController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, entity, userId } = req.query;
            const result = await audit_service_1.AuditService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                entity, userId,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const log = await audit_service_1.AuditService.getById(req.params.id);
            res.json({ success: true, data: log });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditController = AuditController;
//# sourceMappingURL=audit.controller.js.map