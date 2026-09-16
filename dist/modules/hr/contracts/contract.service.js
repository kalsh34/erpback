"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractService = void 0;
const Contract_1 = require("../../../models/Contract");
const Employee_1 = require("../../../models/Employee");
const types_1 = require("../../../types");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
class ContractService {
    static async getByEmployeeId(employeeId) {
        return Contract_1.Contract.findOne({ employeeId }).sort({ createdAt: -1 });
    }
    static async getAll(query) {
        const { page = 1, limit = 20, status, search } = query;
        const skip = (page - 1) * limit;
        const filter = {};
        if (status)
            filter.status = status;
        if (search) {
            filter.$or = [
                { contractType: { $regex: search, $options: 'i' } },
            ];
        }
        const [contracts, total] = await Promise.all([
            Contract_1.Contract.find(filter).populate('employeeId', 'firstName lastName employeeCode').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Contract_1.Contract.countDocuments(filter),
        ]);
        return { data: contracts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    static async create(data, auditCtx) {
        const existing = await Contract_1.Contract.findOne({ employeeId: data.employeeId, status: 'ACTIVE' });
        if (existing)
            throw ApiError_1.ApiError.conflict('Employee already has an active contract');
        const contract = await Contract_1.Contract.create(data);
        await Employee_1.Employee.findByIdAndUpdate(data.employeeId, { status: types_1.EmployeeStatus.CONTRACTED });
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CONTRACT_CREATE',
                entity: 'Contract',
                entityId: contract._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.contract.created', { contractId: contract._id, employeeId: data.employeeId });
        return contract;
    }
    static async update(id, data, auditCtx) {
        const old = await Contract_1.Contract.findById(id);
        if (!old)
            throw ApiError_1.ApiError.notFound('Contract not found');
        const oldValues = old.toObject();
        const contract = await Contract_1.Contract.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!contract)
            throw ApiError_1.ApiError.notFound('Contract not found');
        if (data.status === 'TERMINATED' && old.status !== 'TERMINATED') {
            const hasOtherActive = await Contract_1.Contract.countDocuments({ employeeId: old.employeeId, status: 'ACTIVE', _id: { $ne: id } });
            if (hasOtherActive === 0) {
                await Employee_1.Employee.findByIdAndUpdate(old.employeeId, { status: types_1.EmployeeStatus.ACTIVE });
            }
        }
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CONTRACT_UPDATE',
                entity: 'Contract',
                entityId: id,
                oldValues: { contractType: oldValues.contractType, wage: oldValues.wage, status: oldValues.status },
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.contract.updated', { contractId: id });
        return contract;
    }
    static async delete(id, auditCtx) {
        const contract = await Contract_1.Contract.findById(id);
        if (!contract)
            throw ApiError_1.ApiError.notFound('Contract not found');
        const snapshot = contract.toObject();
        await Contract_1.Contract.findByIdAndDelete(id);
        if (snapshot.status === 'ACTIVE') {
            const hasOtherActive = await Contract_1.Contract.countDocuments({ employeeId: snapshot.employeeId, status: 'ACTIVE' });
            if (hasOtherActive === 0) {
                await Employee_1.Employee.findByIdAndUpdate(snapshot.employeeId, { status: types_1.EmployeeStatus.ACTIVE });
            }
        }
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'CONTRACT_DELETE',
                entity: 'Contract',
                entityId: id,
                oldValues: { contractType: snapshot.contractType, employeeId: snapshot.employeeId },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        EventBus_1.eventBus.emit('hr.contract.deleted', { contractId: id });
    }
}
exports.ContractService = ContractService;
//# sourceMappingURL=contract.service.js.map