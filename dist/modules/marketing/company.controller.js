"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProformaCompanyController = void 0;
const company_service_1 = require("./company.service");
function ctx(req) {
    return { userId: req.user?.userId, ip: req.ip, ua: req.get('user-agent') };
}
class ProformaCompanyController {
    static async getAll(req, res, next) {
        try {
            const result = await company_service_1.ProformaCompanyService.getAll({
                page: req.query.page ? parseInt(req.query.page, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
                search: req.query.search,
                status: req.query.status,
                sort: req.query.sort,
                dir: req.query.dir,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async getById(req, res, next) {
        try {
            const result = await company_service_1.ProformaCompanyService.getDetail(req.params.id);
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const result = await company_service_1.ProformaCompanyService.create(req.body, ctx(req));
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const result = await company_service_1.ProformaCompanyService.update(req.params.id, req.body, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    static async deactivate(req, res, next) {
        try {
            const result = await company_service_1.ProformaCompanyService.deactivate(req.params.id, ctx(req));
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ProformaCompanyController = ProformaCompanyController;
//# sourceMappingURL=company.controller.js.map