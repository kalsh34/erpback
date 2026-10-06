import mongoose from 'mongoose';
import { EmployeeDeduction, IEmployeeDeduction } from '../../models/EmployeeDeduction';
import { EmployeeDeductionType, DeductionStatus } from '../../types';
import { ApiError } from '../../common/ApiError';

export interface AppliableDeduction {
  deductionId: string;
  type: string;
  label: string;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "YYYY-MM" of a Date using UTC parts (form dates arrive as UTC midnight). */
export function periodKeyOf(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * EMPLOYEE DEDUCTIONS — loans / advances / penalties / other.
 * Shared by guard payroll and staff payroll.
 */
export class DeductionsService {
  /**
   * Deductions that apply to one employee for one payroll month.
   * LOAN/ADVANCE: installment, from the start month onward, capped by balance.
   * PENALTY/OTHER: one-off, applied only in their own periodKey.
   */
  static async listForPeriod(employeeId: string, periodKey: string): Promise<AppliableDeduction[]> {
    const docs = await EmployeeDeduction.find({ employeeId, status: DeductionStatus.ACTIVE });
    const out: AppliableDeduction[] = [];
    for (const doc of docs) {
      if (doc.type === EmployeeDeductionType.LOAN || doc.type === EmployeeDeductionType.ADVANCE) {
        if (doc.remainingBalance <= 0 || !doc.startDate) continue;
        if (periodKeyOf(doc.startDate) > periodKey) continue;
        const installment = doc.monthlyInstallment && doc.monthlyInstallment > 0 ? doc.monthlyInstallment : doc.remainingBalance;
        const amount = round2(Math.min(installment, doc.remainingBalance));
        if (amount > 0) out.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount });
      } else if (doc.periodKey === periodKey && doc.totalAmount > 0) {
        out.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount: round2(doc.totalAmount) });
      }
    }
    return out;
  }

  /**
   * Batch fetch deductions for multiple employees in a single query (10x faster).
   */
  static async listForPeriodBatch(
    employeeIds: (string | mongoose.Types.ObjectId)[],
    periodKey: string
  ): Promise<Map<string, AppliableDeduction[]>> {
    const docs = await EmployeeDeduction.find({
      employeeId: { $in: employeeIds },
      status: DeductionStatus.ACTIVE,
    });
    const out = new Map<string, AppliableDeduction[]>();
    for (const doc of docs) {
      const empKey = doc.employeeId.toString();
      if (!out.has(empKey)) out.set(empKey, []);
      const list = out.get(empKey)!;

      if (doc.type === EmployeeDeductionType.LOAN || doc.type === EmployeeDeductionType.ADVANCE) {
        if (doc.remainingBalance <= 0 || !doc.startDate) continue;
        if (periodKeyOf(doc.startDate) > periodKey) continue;
        const installment = doc.monthlyInstallment && doc.monthlyInstallment > 0 ? doc.monthlyInstallment : doc.remainingBalance;
        const amount = round2(Math.min(installment, doc.remainingBalance));
        if (amount > 0) list.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount });
      } else if (doc.periodKey === periodKey && doc.totalAmount > 0) {
        list.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount: round2(doc.totalAmount) });
      }
    }
    return out;
  }

  /**
   * Reduce loan/advance balances for the deductions actually taken in a run.
   * Called once when the run is APPROVED — never while it is still draft.
   */
  static async settleRun(records: { deductions: { deductionId: mongoose.Types.ObjectId | string; amount: number }[] }[]) {
    const applied = new Map<string, number>();
    for (const record of records) {
      for (const line of record.deductions) {
        const key = line.deductionId.toString();
        applied.set(key, round2((applied.get(key) || 0) + line.amount));
      }
    }
    for (const [id, amount] of applied) {
      const doc = await EmployeeDeduction.findById(id);
      if (!doc || doc.status !== DeductionStatus.ACTIVE) continue;
      if (doc.type === EmployeeDeductionType.LOAN || doc.type === EmployeeDeductionType.ADVANCE) {
        doc.remainingBalance = round2(Math.max(0, doc.remainingBalance - amount));
        if (doc.remainingBalance <= 0) doc.status = DeductionStatus.COMPLETED;
        await doc.save();
      }
    }
  }

  /**
   * Rollback loan/advance balance reductions if an APPROVED run is RETURNED for correction.
   * Prevents double-deduction when payroll is recalculated and re-approved.
   */
  static async revertRun(records: { deductions: { deductionId: mongoose.Types.ObjectId | string; amount: number }[] }[]) {
    const applied = new Map<string, number>();
    for (const record of records) {
      for (const line of record.deductions) {
        const key = line.deductionId.toString();
        applied.set(key, round2((applied.get(key) || 0) + line.amount));
      }
    }
    for (const [id, amount] of applied) {
      const doc = await EmployeeDeduction.findById(id);
      if (!doc) continue;
      if (doc.type === EmployeeDeductionType.LOAN || doc.type === EmployeeDeductionType.ADVANCE) {
        doc.remainingBalance = round2(Math.min(doc.totalAmount, doc.remainingBalance + amount));
        if (doc.status === DeductionStatus.COMPLETED && doc.remainingBalance > 0) {
          doc.status = DeductionStatus.ACTIVE;
        }
        await doc.save();
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // CRUD (admin-facing)
  // ───────────────────────────────────────────────────────────────────

  static async list(filter: { employeeId?: string; status?: string }) {
    const query: Record<string, unknown> = {};
    if (filter.employeeId) query.employeeId = filter.employeeId;
    if (filter.status) query.status = filter.status;
    return EmployeeDeduction.find(query).sort({ createdAt: -1 }).limit(500);
  }

  static async create(input: {
    employeeId: string;
    type: EmployeeDeductionType;
    label: string;
    totalAmount: number;
    monthlyInstallment?: number | null;
    startDate?: string | null;
    periodKey?: string | null;
    notes?: string;
    userId: string;
  }): Promise<IEmployeeDeduction> {
    if (!input.employeeId) throw ApiError.badRequest('employeeId is required');
    if (!Object.values(EmployeeDeductionType).includes(input.type)) throw ApiError.badRequest('Invalid deduction type');
    if (!input.label?.trim()) throw ApiError.badRequest('A label is required');
    if (typeof input.totalAmount !== 'number' || input.totalAmount <= 0) throw ApiError.badRequest('totalAmount must be greater than 0');

    const isInstallment = input.type === EmployeeDeductionType.LOAN || input.type === EmployeeDeductionType.ADVANCE;
    if (isInstallment) {
      if (!input.startDate) throw ApiError.badRequest('startDate is required for loans and advances');
      const installment = input.monthlyInstallment && input.monthlyInstallment > 0 ? input.monthlyInstallment : input.totalAmount;
      if (installment > input.totalAmount) throw ApiError.badRequest('monthlyInstallment cannot exceed totalAmount');
    } else if (!input.periodKey) {
      throw ApiError.badRequest('periodKey (YYYY-MM) is required for penalties and other one-off deductions');
    }

    return EmployeeDeduction.create({
      employeeId: input.employeeId,
      type: input.type,
      label: input.label.trim(),
      totalAmount: round2(input.totalAmount),
      monthlyInstallment: isInstallment ? round2(input.monthlyInstallment && input.monthlyInstallment > 0 ? input.monthlyInstallment : input.totalAmount) : null,
      remainingBalance: isInstallment ? round2(input.totalAmount) : 0,
      startDate: isInstallment ? new Date(input.startDate as string) : null,
      periodKey: isInstallment ? null : input.periodKey,
      notes: input.notes,
      status: DeductionStatus.ACTIVE,
      createdBy: input.userId as any,
    });
  }

  static async cancel(id: string) {
    const doc = await EmployeeDeduction.findById(id);
    if (!doc) throw ApiError.notFound('Deduction not found');
    if (doc.status === DeductionStatus.CANCELLED) throw ApiError.badRequest('Deduction is already cancelled');
    doc.status = DeductionStatus.CANCELLED;
    await doc.save();
    return doc;
  }
}
