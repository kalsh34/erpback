"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const company_service_1 = require("./company.service");
class CompanyController {
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, search, sort, dir } = req.query;
            const result = await company_service_1.CompanyService.getAll({
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20,
                status: status,
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
            const company = await company_service_1.CompanyService.getById(req.params.id);
            res.json({ success: true, data: company });
        }
        catch (error) {
            next(error);
        }
    }
    static async detail(req, res, next) {
        try {
            const data = await company_service_1.CompanyService.getDetail(req.params.id);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    }
    static async create(req, res, next) {
        try {
            const company = await company_service_1.CompanyService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: company });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const company = await company_service_1.CompanyService.update(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: company });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await company_service_1.CompanyService.delete(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Company deactivated' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanyController = CompanyController;
//# sourceMappingURL=company.controller.js.map