"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceRoleController = void 0;
const serviceRole_service_1 = require("./serviceRole.service");
function ctx(req) {
    return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}
class ServiceRoleController {
    static async getAll(req, res, next) {
        try {
            const result = await serviceRole_service_1.ServiceRoleService.getAll({
                search: req.query.search,
                status: req.query.status,
                activeOnly: req.query.activeOnly,
                category: req.query.category,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await serviceRole_service_1.ServiceRoleService.getById(req.params.id);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await serviceRole_service_1.ServiceRoleService.create(req.body, ctx(req));
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await serviceRole_service_1.ServiceRoleService.update(req.params.id, req.body, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ServiceRoleController = ServiceRoleController;
//# sourceMappingURL=serviceRole.controller.js.map