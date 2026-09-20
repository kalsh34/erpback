"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuarantorService = void 0;
const Guarantor_1 = require("../../../models/Guarantor");
const Employee_1 = require("../../../models/Employee");
const Contract_1 = require("../../../models/Contract");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
const EventBus_1 = require("../../../core/events/EventBus");
async function checkAndActivateEmployee(employeeId) {
    const employee = await Employee_1.Employee.findById(employeeId);
    if (!employee)
        return;
    const hasVerifiedGuarantor = await Guarantor_1.Guarantor.findOne({
        employeeId,
        verificationStatus: Guarantor_1.GuarantorVerificationStatus.VERIFIED,
    });
    const hasActiveContract = await Contract_1.Contract.findOne({
        employeeId,
        status: 'ACTIVE',
    });
    if (hasVerifiedGuarantor && hasActiveContract && employee.status !== 'ACTIVE') {
        employee.status = 'ACTIVE';
        await employee.save();
    }
}
class GuarantorService {
    static async getByEmployeeId(employeeId) {
        return Guarantor_1.Guarantor.find({ employeeId }).sort({ createdAt: -1 });
    }
    static async getById(id) {
        const guarantor = await Guarantor_1.Guarantor.findById(id);
        if (!guarantor)
            throw ApiError_1.ApiError.notFound('Guarantor not found');
        return guarantor;
    }
    static async create(data, auditCtx) {
        const employee = await Employee_1.Employee.findById(data.employeeId);
        if (!employee)
            throw ApiError_1.ApiError.notFound('Employee not found');
        const guarantor = await Guarantor_1.Guarantor.create(data);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARANTOR_CREATE',
                entity: 'Guarantor',
                entityId: guarantor._id.toString(),
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.userAgent,
            });
        }
        EventBus_1.eventBus.emit('hr.guarantor.created', { guarantorId: guarantor._id, employeeId: data.employeeId });
        return guarantor;
    }
    static async update(id, data, auditCtx) {
        const guarantor = await Guarantor_1.Guarantor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
        if (!guarantor)
            throw ApiError_1.ApiError.notFound('Guarantor not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARANTOR_UPDATE',
                entity: 'Guarantor',
                entityId: id,
                newValues: data,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.userAgent,
            });
        }
        return guarantor;
    }
    static async verify(id, verifiedById, auditCtx) {
        const guarantor = await Guarantor_1.Guarantor.findById(id);
        if (!guarantor)
            throw ApiError_1.ApiError.notFound('Guarantor not found');
        const hasRealDocuments = guarantor.documents && guarantor.documents.length > 0 &&
            guarantor.documents.some(d => d.url && !d.url.startsWith('/uploads/doc_'));
        if (!hasRealDocuments) {
            throw ApiError_1.ApiError.badRequest('Cannot verify guarantor without at least one uploaded document');
        }
        guarantor.verificationStatus = Guarantor_1.GuarantorVerificationStatus.VERIFIED;
        guarantor.verifiedById = verifiedById;
        guarantor.verifiedAt = new Date();
        guarantor.rejectionReason = undefined;
        await guarantor.save();
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARANTOR_VERIFY',
                entity: 'Guarantor',
                entityId: id,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.userAgent,
            });
        }
        await checkAndActivateEmployee(guarantor.employeeId.toString());
        EventBus_1.eventBus.emit('hr.guarantor.verified', { guarantorId: guarantor._id, employeeId: guarantor.employeeId });
        return guarantor;
    }
    static async reject(id, rejectionReason, auditCtx) {
        const guarantor = await Guarantor_1.Guarantor.findByIdAndUpdate(id, {
            verificationStatus: Guarantor_1.GuarantorVerificationStatus.REJECTED,
            rejectionReason,
            verifiedById: auditCtx?.userId,
            verifiedAt: new Date(),
        }, { new: true });
        if (!guarantor)
            throw ApiError_1.ApiError.notFound('Guarantor not found');
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARANTOR_REJECT',
                entity: 'Guarantor',
                entityId: id,
                reason: rejectionReason,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.userAgent,
            });
        }
        return guarantor;
    }
    static async delete(id, auditCtx) {
        const guarantor = await Guarantor_1.Guarantor.findById(id);
        if (!guarantor)
            throw ApiError_1.ApiError.notFound('Guarantor not found');
        await Guarantor_1.Guarantor.findByIdAndDelete(id);
        if (auditCtx) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'GUARANTOR_DELETE',
                entity: 'Guarantor',
                entityId: id,
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.userAgent,
            });
        }
    }
}
exports.GuarantorService = GuarantorService;
//# sourceMappingURL=guarantor.service.js.map