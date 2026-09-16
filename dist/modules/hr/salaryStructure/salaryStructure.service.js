"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryStructureService = void 0;
const SalaryStructure_1 = require("../../../models/SalaryStructure");
const ApiError_1 = require("../../../common/ApiError");
class SalaryStructureService {
    static async getAll(employeeType, isCurrent) {
        const filter = {};
        if (employeeType)
            filter.employeeType = employeeType;
        if (isCurrent !== undefined)
            filter.isCurrent = isCurrent;
        return SalaryStructure_1.SalaryStructure.find(filter).sort({ version: -1 }).populate('createdById', 'firstName lastName');
    }
    static async getById(id) {
        const structure = await SalaryStructure_1.SalaryStructure.findById(id).populate('createdById', 'firstName lastName');
        if (!structure)
            throw ApiError_1.ApiError.notFound('Salary structure not found');
        return structure;
    }
    static async getCurrent(employeeType) {
        return SalaryStructure_1.SalaryStructure.findOne({ employeeType, isCurrent: true });
    }
    static async getDashboard() {
        const [total, active, guardStructures, staffStructures] = await Promise.all([
            SalaryStructure_1.SalaryStructure.countDocuments(),
            SalaryStructure_1.SalaryStructure.countDocuments({ isCurrent: true }),
            SalaryStructure_1.SalaryStructure.countDocuments({ employeeType: 'GUARD' }),
            SalaryStructure_1.SalaryStructure.countDocuments({ employeeType: 'STAFF' }),
        ]);
        return { total, active, guardStructures, staffStructures };
    }
    static async create(data) {
        const maxVersion = await SalaryStructure_1.SalaryStructure.findOne({ employeeType: data.employeeType })
            .sort({ version: -1 })
            .select('version');
        const version = (maxVersion?.version || 0) + 1;
        const structure = await SalaryStructure_1.SalaryStructure.create({
            ...data,
            version,
            isCurrent: true,
            createdById: data.createdById,
        });
        return structure;
    }
    static async retire(id) {
        const structure = await SalaryStructure_1.SalaryStructure.findById(id);
        if (!structure)
            throw ApiError_1.ApiError.notFound('Salary structure not found');
        if (!structure.isCurrent)
            throw ApiError_1.ApiError.badRequest('Structure is already retired');
        structure.isCurrent = false;
        structure.effectiveTo = new Date();
        await structure.save();
        return structure;
    }
    static async getVersions(employeeType) {
        return SalaryStructure_1.SalaryStructure.find({ employeeType }).sort({ version: -1 });
    }
    static async duplicate(id, createdById) {
        const source = await SalaryStructure_1.SalaryStructure.findById(id);
        if (!source)
            throw ApiError_1.ApiError.notFound('Salary structure not found');
        const maxVersion = await SalaryStructure_1.SalaryStructure.findOne({ employeeType: source.employeeType })
            .sort({ version: -1 })
            .select('version');
        const version = (maxVersion?.version || 0) + 1;
        const structure = await SalaryStructure_1.SalaryStructure.create({
            name: `${source.name} (Copy)`,
            employeeType: source.employeeType,
            payBasis: source.payBasis,
            version,
            isCurrent: true,
            effectiveFrom: new Date(),
            otMultiplier: source.otMultiplier,
            holidayMultiplier: source.holidayMultiplier,
            earnings: source.earnings.map((e) => ({ ...e })),
            deductions: source.deductions.map((d) => ({ ...d })),
            createdById,
        });
        return structure;
    }
    static async update(id, data) {
        const structure = await SalaryStructure_1.SalaryStructure.findById(id);
        if (!structure)
            throw ApiError_1.ApiError.notFound('Salary structure not found');
        if (!structure.isCurrent)
            throw ApiError_1.ApiError.badRequest('Cannot edit a retired structure');
        if (data.name !== undefined)
            structure.name = data.name;
        if (data.otMultiplier !== undefined)
            structure.otMultiplier = data.otMultiplier;
        if (data.holidayMultiplier !== undefined)
            structure.holidayMultiplier = data.holidayMultiplier;
        if (data.earnings !== undefined)
            structure.earnings = data.earnings;
        if (data.deductions !== undefined)
            structure.deductions = data.deductions;
        await structure.save();
        return structure;
    }
}
exports.SalaryStructureService = SalaryStructureService;
//# sourceMappingURL=salaryStructure.service.js.map