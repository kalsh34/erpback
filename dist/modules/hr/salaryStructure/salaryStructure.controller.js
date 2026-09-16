"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryStructureController = void 0;
const salaryStructure_service_1 = require("./salaryStructure.service");
class SalaryStructureController {
    static async getAll(req, res, next) {
        try {
            const { employeeType, isCurrent } = req.query;
            const structures = await salaryStructure_service_1.SalaryStructureService.getAll(employeeType, isCurrent === 'true' ? true : isCurrent === 'false' ? false : undefined);
            res.json({ data: structures });
        }
        catch (err) {
            next(err);
        }
    }
    static async getById(req, res, next) {
        try {
            const structure = await salaryStructure_service_1.SalaryStructureService.getById(req.params.id);
            res.json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async getCurrent(req, res, next) {
        try {
            const structure = await salaryStructure_service_1.SalaryStructureService.getCurrent(req.params.employeeType);
            res.json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async getDashboard(_req, res, next) {
        try {
            const dashboard = await salaryStructure_service_1.SalaryStructureService.getDashboard();
            res.json({ data: dashboard });
        }
        catch (err) {
            next(err);
        }
    }
    static async create(req, res, next) {
        try {
            const userId = req.user.userId;
            const structure = await salaryStructure_service_1.SalaryStructureService.create({
                ...req.body,
                effectiveFrom: req.body.effectiveFrom || new Date(),
                createdById: userId,
            });
            res.status(201).json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async update(req, res, next) {
        try {
            const structure = await salaryStructure_service_1.SalaryStructureService.update(req.params.id, req.body);
            res.json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async retire(req, res, next) {
        try {
            const structure = await salaryStructure_service_1.SalaryStructureService.retire(req.params.id);
            res.json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
    static async getVersions(req, res, next) {
        try {
            const versions = await salaryStructure_service_1.SalaryStructureService.getVersions(req.params.employeeType);
            res.json({ data: versions });
        }
        catch (err) {
            next(err);
        }
    }
    static async duplicate(req, res, next) {
        try {
            const userId = req.user.userId;
            const structure = await salaryStructure_service_1.SalaryStructureService.duplicate(req.params.id, userId);
            res.status(201).json({ data: structure });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.SalaryStructureController = SalaryStructureController;
//# sourceMappingURL=salaryStructure.controller.js.map