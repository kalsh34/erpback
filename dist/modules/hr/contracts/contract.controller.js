"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractController = void 0;
const contract_service_1 = require("./contract.service");
class ContractController {
    static async getByEmployee(req, res, next) {
        try {
            const contract = await contract_service_1.ContractService.getByEmployeeId(req.params.employeeId);
            res.json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    static async getAll(req, res, next) {
        try {
            const { page, limit, status, search } = req.query;
            const result = await contract_service_1.ContractService.getAll({
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
    static async create(req, res, next) {
        try {
            const contract = await contract_service_1.ContractService.create(req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    static async update(req, res, next) {
        try {
            const contract = await contract_service_1.ContractService.update(req.params.id, req.body, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, data: contract });
        }
        catch (error) {
            next(error);
        }
    }
    static async delete(req, res, next) {
        try {
            await contract_service_1.ContractService.delete(req.params.id, {
                userId: req.user?.userId || '',
                ip: req.ip,
                ua: req.get('user-agent'),
            });
            res.json({ success: true, message: 'Contract deleted' });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ContractController = ContractController;
//# sourceMappingURL=contract.controller.js.map