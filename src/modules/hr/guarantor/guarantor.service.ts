import { Guarantor, IGuarantor, GuarantorType, GuarantorVerificationStatus } from '../../../models/Guarantor';
import { Employee } from '../../../models/Employee';
import { activateEmployeeIfEligible } from '../employees/activation';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

interface AuditCtx {
  userId: string;
  ip?: string;
  userAgent?: string;
}

export class GuarantorService {
  static async getByEmployeeId(employeeId: string): Promise<IGuarantor[]> {
    return Guarantor.find({ employeeId }).sort({ createdAt: -1 });
  }

  static async getById(id: string): Promise<IGuarantor> {
    const guarantor = await Guarantor.findById(id);
    if (!guarantor) throw ApiError.notFound('Guarantor not found');
    return guarantor;
  }

  static async create(data: Partial<IGuarantor>, auditCtx?: AuditCtx): Promise<IGuarantor> {
    const employee = await Employee.findById(data.employeeId);
    if (!employee) throw ApiError.notFound('Employee not found');

    const guarantor = await Guarantor.create(data);

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARANTOR_CREATE',
        entity: 'Guarantor',
        entityId: (guarantor._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.userAgent,
      });
    }

    eventBus.emit('hr.guarantor.created', { guarantorId: guarantor._id, employeeId: data.employeeId });
    return guarantor;
  }

  static async update(id: string, data: Partial<IGuarantor>, auditCtx?: AuditCtx): Promise<IGuarantor> {
    const guarantor = await Guarantor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!guarantor) throw ApiError.notFound('Guarantor not found');

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARANTOR_UPDATE',
        entity: 'Guarantor',
        entityId: id,
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.userAgent,
      });
    }

    return guarantor;
  }

  static async verify(id: string, verifiedById: string, auditCtx?: AuditCtx): Promise<IGuarantor> {
    const guarantor = await Guarantor.findByIdAndUpdate(
      id,
      {
        verificationStatus: GuarantorVerificationStatus.VERIFIED,
        verifiedById,
        verifiedAt: new Date(),
        rejectionReason: undefined,
      },
      { new: true }
    );
    if (!guarantor) throw ApiError.notFound('Guarantor not found');

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'GUARANTOR_VERIFY',
        entity: 'Guarantor',
        entityId: id,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.userAgent,
      });
    }

    await activateEmployeeIfEligible(guarantor.employeeId.toString());
    eventBus.emit('hr.guarantor.verified', { guarantorId: guarantor._id, employeeId: guarantor.employeeId });
    return guarantor;
  }

  static async reject(id: string, rejectionReason: string, auditCtx?: AuditCtx): Promise<IGuarantor> {
    const guarantor = await Guarantor.findByIdAndUpdate(
      id,
      {
        verificationStatus: GuarantorVerificationStatus.REJECTED,
        rejectionReason,
        verifiedById: auditCtx?.userId,
        verifiedAt: new Date(),
      },
      { new: true }
    );
    if (!guarantor) throw ApiError.notFound('Guarantor not found');

    if (auditCtx) {
      AuditService.log({
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

  static async delete(id: string, auditCtx?: AuditCtx): Promise<void> {
    const guarantor = await Guarantor.findById(id);
    if (!guarantor) throw ApiError.notFound('Guarantor not found');

    await Guarantor.findByIdAndDelete(id);

    if (auditCtx) {
      AuditService.log({
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
