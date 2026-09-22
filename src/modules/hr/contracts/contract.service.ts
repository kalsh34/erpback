import { Contract, IContract } from '../../../models/Contract';
import { Employee } from '../../../models/Employee';
import { EmployeeStatus } from '../../../types';
import { activateEmployeeIfEligible } from '../employees/activation';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

export class ContractService {
  static async getByEmployeeId(employeeId: string): Promise<IContract | null> {
    return Contract.findOne({ employeeId }).sort({ createdAt: -1 });
  }

  static async getAll(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { contractType: { $regex: search, $options: 'i' } },
      ];
    }
    const [contracts, total] = await Promise.all([
      Contract.find(filter).populate('employeeId', 'firstName lastName employeeCode').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Contract.countDocuments(filter),
    ]);
    return { data: contracts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  static async create(data: Partial<IContract>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IContract> {
    const existing = await Contract.findOne({ employeeId: data.employeeId, status: 'ACTIVE' });
    if (existing) throw ApiError.conflict('Employee already has an active contract');

    const contract = await Contract.create(data);

    await Employee.findByIdAndUpdate(data.employeeId, { status: EmployeeStatus.CONTRACTED });

    // With the contract in place the employee may now qualify for ACTIVE (when a
    // verified guarantor is already on file).
    await activateEmployeeIfEligible(String(data.employeeId));

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CONTRACT_CREATE',
        entity: 'Contract',
        entityId: (contract._id as any).toString(),
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.contract.created', { contractId: contract._id, employeeId: data.employeeId });

    return contract;
  }

  static async update(id: string, data: Partial<IContract>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IContract> {
    const old = await Contract.findById(id);
    if (!old) throw ApiError.notFound('Contract not found');
    const oldValues = old.toObject();

    const contract = await Contract.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!contract) throw ApiError.notFound('Contract not found');

    if (data.status === 'ACTIVE' && old.status !== 'ACTIVE') {
      await activateEmployeeIfEligible(String(old.employeeId));
    }

    if (data.status === 'TERMINATED' && old.status !== 'TERMINATED') {
      const hasOtherActive = await Contract.countDocuments({ employeeId: old.employeeId, status: 'ACTIVE', _id: { $ne: id } });
      // An employee without an active contract cannot be ACTIVE any more.
      if (hasOtherActive === 0) {
        await Employee.findByIdAndUpdate(old.employeeId, { status: EmployeeStatus.INACTIVE });
      }
    }

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CONTRACT_UPDATE',
        entity: 'Contract',
        entityId: id,
        oldValues: { contractType: oldValues.contractType, wage: oldValues.wage, status: oldValues.status },
        newValues: data as Record<string, unknown>,
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.contract.updated', { contractId: id });

    return contract;
  }

  static async delete(id: string, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<void> {
    const contract = await Contract.findById(id);
    if (!contract) throw ApiError.notFound('Contract not found');
    const snapshot = contract.toObject();

    await Contract.findByIdAndDelete(id);

    if (snapshot.status === 'ACTIVE') {
      const hasOtherActive = await Contract.countDocuments({ employeeId: snapshot.employeeId, status: 'ACTIVE' });
      // No contract left -> the employee cannot stay ACTIVE.
      if (hasOtherActive === 0) {
        await Employee.findByIdAndUpdate(snapshot.employeeId, { status: EmployeeStatus.INACTIVE });
      }
    }

    if (auditCtx) {
      AuditService.log({
        userId: auditCtx.userId,
        action: 'CONTRACT_DELETE',
        entity: 'Contract',
        entityId: id,
        oldValues: { contractType: snapshot.contractType, employeeId: snapshot.employeeId },
        ipAddress: auditCtx.ip,
        userAgent: auditCtx.ua,
      });
    }
    eventBus.emit('hr.contract.deleted', { contractId: id });
  }
}
