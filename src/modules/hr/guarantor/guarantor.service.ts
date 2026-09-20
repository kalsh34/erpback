import { Guarantor, IGuarantor, GuarantorType, GuarantorVerificationStatus } from '../../../models/Guarantor';
import { Employee } from '../../../models/Employee';
import { Contract } from '../../../models/Contract';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

interface AuditCtx {
  userId: string;
  ip?: string;
  userAgent?: string;
}

async function checkAndActivateEmployee(employeeId: string) {
  const employee = await Employee.findById(employeeId);
  if (!employee) return;

  const hasVerifiedGuarantor = await Guarantor.findOne({
    employeeId,
    verificationStatus: GuarantorVerificationStatus.VERIFIED,
  });

  const hasActiveContract = await Contract.findOne({
    employeeId,
    status: 'ACTIVE',
  });

  if (hasVerifiedGuarantor && hasActiveContract && employee.status !== 'ACTIVE') {
    employee.status = 'ACTIVE' as any;
    await employee.save();
  }
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
    const guarantor = await Guarantor.findById(id);
    if (!guarantor) throw ApiError.notFound('Guarantor not found');

    const hasRealDocuments = guarantor.documents && guarantor.documents.length > 0 &&
      guarantor.documents.some(d => d.url && !d.url.startsWith('/uploads/doc_'));
    if (!hasRealDocuments) {
      throw ApiError.badRequest('Cannot verify guarantor without at least one uploaded document');
    }

    guarantor.verificationStatus = GuarantorVerificationStatus.VERIFIED;
    guarantor.verifiedById = verifiedById as any;
    guarantor.verifiedAt = new Date();
    guarantor.rejectionReason = undefined;
    await guarantor.save();

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

    await checkAndActivateEmployee(guarantor.employeeId.toString());
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
