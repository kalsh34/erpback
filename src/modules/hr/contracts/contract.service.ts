import { Contract, IContract } from '../../../models/Contract';
import { Employee } from '../../../models/Employee';
import { SalaryHistory } from '../../../models/SalaryHistory';
import { EmployeeStatus, EmployeeCategory } from '../../../types';
import { activateEmployeeIfEligible } from '../employees/activation';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';

/** The pay-package fields recorded in SalaryHistory on every change. */
const PAY_FIELDS = [
  'wage',
  'responsibilityAllowance',
  'teleAllowance',
  'taxableTransport',
  'nonTaxableAllowance',
  'transportAllowance',
] as const;

const pickPay = (c: any) =>
  Object.fromEntries(PAY_FIELDS.map((f) => [f, Number(c?.[f] ?? 0)])) as Record<(typeof PAY_FIELDS)[number], number>;

/**
 * DEF-L1: `transportAllowance` is a GUARD-domain field (guard profile / Guard
 * Payroll context). The staff payroll formula (frozen spreadsheet rule) is fed
 * ONLY from `taxableTransport` and `nonTaxableAllowance` — a staff contract
 * that stores a positive transportAllowance silently never affects pay. The
 * field is therefore explicitly rejected for staff contracts with a clear
 * message instead of being silently discarded. Guards keep it.
 */
const STAFF_TRANSPORT_MESSAGE =
  'transportAllowance applies to guard contracts only and is unchanged by Staff Payroll. ' +
  'For staff contracts use taxableTransport (taxable part) and nonTaxableAllowance (non-taxable part); ' +
  'set transportAllowance to 0 or omit it.';

export class ContractService {
  static async getByEmployeeId(employeeId: string): Promise<IContract | null> {
    return Contract.findOne({ employeeId }).sort({ createdAt: -1 });
  }

  /** Full salary-change history for one employee (newest first). */
  static async getSalaryHistory(employeeId: string) {
    return SalaryHistory.find({ employeeId }).sort({ effectiveFrom: -1, createdAt: -1 }).populate('changedBy', 'firstName lastName');
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

  private static async assertStaffTransportField(employeeId: unknown, incoming: Partial<IContract>): Promise<void> {
    const value = Number(incoming?.transportAllowance ?? 0);
    if (!(Number.isFinite(value) && value > 0)) return; // 0/absent — nothing to police
    const emp = await Employee.findOne({ _id: employeeId } as any).select('category').lean();
    if (emp && (emp as any).category === EmployeeCategory.GUARD) return; // guard contracts own the field
    throw ApiError.badRequest(STAFF_TRANSPORT_MESSAGE);
  }

  static async create(data: Partial<IContract>, auditCtx?: { userId: string; ip?: string; ua?: string }): Promise<IContract> {
    const existing = await Contract.findOne({ employeeId: data.employeeId, status: 'ACTIVE' });
    if (existing) throw ApiError.conflict('Employee already has an active contract');
    await ContractService.assertStaffTransportField(data.employeeId, data);

    const contract = await Contract.create(data);

    // Baseline salary history row — the starting package of this contract.
    await SalaryHistory.create({
      employeeId: data.employeeId,
      contractId: contract._id,
      effectiveFrom: data.contractStartDate || new Date(),
      previous: undefined,
      current: pickPay(contract),
      reason: 'Contract created',
      changedBy: auditCtx?.userId,
    });

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
    await ContractService.assertStaffTransportField(old.employeeId, data);
    const oldValues = old.toObject();

    const contract = await Contract.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!contract) throw ApiError.notFound('Contract not found');

    // Pay package changed? Record the OLD package in the salary history so
    // previous salaries are never lost when a contract is updated.
    const oldPay = pickPay(oldValues);
    const newPay = pickPay(contract);
    const payChanged = PAY_FIELDS.some((f) => oldPay[f] !== newPay[f]);
    if (payChanged) {
      await SalaryHistory.create({
        employeeId: old.employeeId,
        contractId: id as any,
        effectiveFrom: (data.contractStartDate as any) || old.contractStartDate || new Date(),
        previous: oldPay,
        current: newPay,
        reason: 'Contract updated',
        changedBy: auditCtx?.userId,
      });
      eventBus.emit('hr.contract.salaryChanged', {
        contractId: id,
        employeeId: old.employeeId,
        previousWage: oldPay.wage,
        newWage: newPay.wage,
      });
    }

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
