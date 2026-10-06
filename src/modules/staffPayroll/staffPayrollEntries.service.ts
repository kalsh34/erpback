import { StaffOvertimeEntry, StaffBonus } from '../../models/StaffPayrollEntries';
import { Employee } from '../../models/Employee';
import { EmployeeCategory } from '../../types';
import { ApiError } from '../../common/ApiError';
import { AuditService } from '../../core/audit/AuditService';
import { DeductionStatus } from '../../types';

interface AuditCtx { ip?: string; ua?: string }

function assertStaffEmployee(employeeId: string) {
  return Employee.findById(employeeId).then((e) => {
    if (!e) throw ApiError.notFound('Employee not found');
    if (e.category !== EmployeeCategory.OFFICE_STAFF) {
      throw ApiError.badRequest('Overtime and bonus entries are for OFFICE_STAFF employees only');
    }
    return e;
  });
}

function assertPeriodKey(periodKey: string) {
  if (!/^\d{4}-\d{2}$/.test(periodKey)) throw ApiError.badRequest('periodKey must be in YYYY-MM format');
}

/**
 * STAFF PAYROLL ENTRIES — period-keyed overtime and bonus inputs.
 * Both are upserted per employee+period: entering again for the same month
 * replaces the value. Neither changes Guard Payroll in any way.
 */
export class StaffPayrollEntriesService {
  // ── Overtime (amount enters Gross AND Taxable earnings) ───────────

  static async listOvertime(filters: { periodKey?: string; employeeId?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.periodKey) query.periodKey = filters.periodKey;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    return StaffOvertimeEntry.find(query)
      .populate('employeeId', 'employeeCode firstName lastName')
      .sort({ periodKey: -1, 'employeeId.employeeCode': 1 })
      .limit(500);
  }

  static async saveOvertime(
    input: { employeeId: string; periodKey: string; amount: number; hours?: number | null; notes?: string },
    userId: string,
    auditCtx?: AuditCtx
  ) {
    assertPeriodKey(input.periodKey);
    if (!input.employeeId) throw ApiError.badRequest('employeeId is required');
    if (typeof input.amount !== 'number' || input.amount < 0) throw ApiError.badRequest('amount must be a non-negative number');
    const employee = await assertStaffEmployee(input.employeeId);

    const doc = await StaffOvertimeEntry.findOneAndUpdate(
      { employeeId: input.employeeId, periodKey: input.periodKey, status: DeductionStatus.ACTIVE },
      {
        $set: {
          amount: input.amount,
          hours: input.hours ?? null,
          notes: input.notes?.trim() || undefined,
          createdBy: userId as any,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await AuditService.log({
      userId,
      action: 'STAFF_OVERTIME_SAVE',
      entity: 'StaffOvertimeEntry',
      entityId: doc._id.toString(),
      newValues: { employeeId: input.employeeId, periodKey: input.periodKey, amount: input.amount, hours: input.hours ?? null },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    void employee;
    return doc;
  }

  static async cancelOvertime(id: string, userId: string, auditCtx?: AuditCtx) {
    const doc = await StaffOvertimeEntry.findById(id);
    if (!doc) throw ApiError.notFound('Overtime entry not found');
    doc.status = DeductionStatus.CANCELLED;
    await doc.save();
    await AuditService.log({
      userId,
      action: 'STAFF_OVERTIME_CANCEL',
      entity: 'StaffOvertimeEntry',
      entityId: doc._id.toString(),
      newValues: { employeeId: doc.employeeId.toString(), periodKey: doc.periodKey, amount: doc.amount },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    return doc;
  }

  // ── Bonus (OUTSIDE the formula: added after Net Pay, never taxed) ──

  static async listBonuses(filters: { periodKey?: string; employeeId?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (filters.periodKey) query.periodKey = filters.periodKey;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    return StaffBonus.find(query)
      .populate('employeeId', 'employeeCode firstName lastName')
      .sort({ periodKey: -1, 'employeeId.employeeCode': 1 })
      .limit(500);
  }

  static async saveBonus(
    input: { employeeId: string; periodKey: string; amount: number; label: string },
    userId: string,
    auditCtx?: AuditCtx
  ) {
    assertPeriodKey(input.periodKey);
    if (!input.employeeId) throw ApiError.badRequest('employeeId is required');
    if (typeof input.amount !== 'number' || input.amount <= 0) throw ApiError.badRequest('amount must be greater than 0');
    if (!input.label?.trim()) throw ApiError.badRequest('A label is required (e.g. "Annual bonus")');
    const employee = await assertStaffEmployee(input.employeeId);

    const doc = await StaffBonus.create({
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      amount: input.amount,
      label: input.label.trim(),
      createdBy: userId as any,
    });
    await AuditService.log({
      userId,
      action: 'STAFF_BONUS_CREATE',
      entity: 'StaffBonus',
      entityId: doc._id.toString(),
      newValues: { employeeId: input.employeeId, periodKey: input.periodKey, amount: input.amount, label: doc.label },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    void employee;
    return doc;
  }

  static async cancelBonus(id: string, userId: string, auditCtx?: AuditCtx) {
    const doc = await StaffBonus.findById(id);
    if (!doc) throw ApiError.notFound('Bonus entry not found');
    doc.status = DeductionStatus.CANCELLED;
    await doc.save();
    await AuditService.log({
      userId,
      action: 'STAFF_BONUS_CANCEL',
      entity: 'StaffBonus',
      entityId: doc._id.toString(),
      newValues: { employeeId: doc.employeeId.toString(), periodKey: doc.periodKey, amount: doc.amount },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    return doc;
  }
}
