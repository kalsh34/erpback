"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeductionsService = void 0;
exports.periodKeyOf = periodKeyOf;
const EmployeeDeduction_1 = require("../../models/EmployeeDeduction");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const round2 = (n) => Math.round(n * 100) / 100;
/** "YYYY-MM" of a Date using UTC parts (form dates arrive as UTC midnight). */
function periodKeyOf(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
/**
 * EMPLOYEE DEDUCTIONS — loans / advances / penalties / other.
 * Shared by guard payroll and staff payroll.
 */
class DeductionsService {
    /**
     * Deductions that apply to one employee for one payroll month.
     * LOAN/ADVANCE: installment, from the start month onward, capped by balance.
     * PENALTY/OTHER: one-off, applied only in their own periodKey.
     */
    static async listForPeriod(employeeId, periodKey) {
        const docs = await EmployeeDeduction_1.EmployeeDeduction.find({ employeeId, status: types_1.DeductionStatus.ACTIVE });
        const out = [];
        for (const doc of docs) {
            if (doc.type === types_1.EmployeeDeductionType.LOAN || doc.type === types_1.EmployeeDeductionType.ADVANCE) {
                if (doc.remainingBalance <= 0 || !doc.startDate)
                    continue;
                if (periodKeyOf(doc.startDate) > periodKey)
                    continue;
                const installment = doc.monthlyInstallment && doc.monthlyInstallment > 0 ? doc.monthlyInstallment : doc.remainingBalance;
                const amount = round2(Math.min(installment, doc.remainingBalance));
                if (amount > 0)
                    out.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount });
            }
            else if (doc.periodKey === periodKey && doc.totalAmount > 0) {
                out.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount: round2(doc.totalAmount) });
            }
        }
        return out;
    }
    /**
     * Batch fetch deductions for multiple employees in a single query (10x faster).
     */
    static async listForPeriodBatch(employeeIds, periodKey) {
        const docs = await EmployeeDeduction_1.EmployeeDeduction.find({
            employeeId: { $in: employeeIds },
            status: types_1.DeductionStatus.ACTIVE,
        });
        const out = new Map();
        for (const doc of docs) {
            const empKey = doc.employeeId.toString();
            if (!out.has(empKey))
                out.set(empKey, []);
            const list = out.get(empKey);
            if (doc.type === types_1.EmployeeDeductionType.LOAN || doc.type === types_1.EmployeeDeductionType.ADVANCE) {
                if (doc.remainingBalance <= 0 || !doc.startDate)
                    continue;
                if (periodKeyOf(doc.startDate) > periodKey)
                    continue;
                const installment = doc.monthlyInstallment && doc.monthlyInstallment > 0 ? doc.monthlyInstallment : doc.remainingBalance;
                const amount = round2(Math.min(installment, doc.remainingBalance));
                if (amount > 0)
                    list.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount });
            }
            else if (doc.periodKey === periodKey && doc.totalAmount > 0) {
                list.push({ deductionId: doc._id.toString(), type: doc.type, label: doc.label, amount: round2(doc.totalAmount) });
            }
        }
        return out;
    }
    /**
     * Reduce loan/advance balances for the deductions actually taken in a run.
     * Called once when the run is APPROVED — never while it is still draft.
     */
    static async settleRun(records) {
        const applied = new Map();
        for (const record of records) {
            for (const line of record.deductions) {
                const key = line.deductionId.toString();
                applied.set(key, round2((applied.get(key) || 0) + line.amount));
            }
        }
        for (const [id, amount] of applied) {
            const doc = await EmployeeDeduction_1.EmployeeDeduction.findById(id);
            if (!doc || doc.status !== types_1.DeductionStatus.ACTIVE)
                continue;
            if (doc.type === types_1.EmployeeDeductionType.LOAN || doc.type === types_1.EmployeeDeductionType.ADVANCE) {
                doc.remainingBalance = round2(Math.max(0, doc.remainingBalance - amount));
                if (doc.remainingBalance <= 0)
                    doc.status = types_1.DeductionStatus.COMPLETED;
                await doc.save();
            }
        }
    }
    /**
     * Rollback loan/advance balance reductions if an APPROVED run is RETURNED for correction.
     * Prevents double-deduction when payroll is recalculated and re-approved.
     */
    static async revertRun(records) {
        const applied = new Map();
        for (const record of records) {
            for (const line of record.deductions) {
                const key = line.deductionId.toString();
                applied.set(key, round2((applied.get(key) || 0) + line.amount));
            }
        }
        for (const [id, amount] of applied) {
            const doc = await EmployeeDeduction_1.EmployeeDeduction.findById(id);
            if (!doc)
                continue;
            if (doc.type === types_1.EmployeeDeductionType.LOAN || doc.type === types_1.EmployeeDeductionType.ADVANCE) {
                doc.remainingBalance = round2(Math.min(doc.totalAmount, doc.remainingBalance + amount));
                if (doc.status === types_1.DeductionStatus.COMPLETED && doc.remainingBalance > 0) {
                    doc.status = types_1.DeductionStatus.ACTIVE;
                }
                await doc.save();
            }
        }
    }
    // ───────────────────────────────────────────────────────────────────
    // CRUD (admin-facing)
    // ───────────────────────────────────────────────────────────────────
    static async list(filter) {
        const query = {};
        if (filter.employeeId)
            query.employeeId = filter.employeeId;
        if (filter.status)
            query.status = filter.status;
        return EmployeeDeduction_1.EmployeeDeduction.find(query).sort({ createdAt: -1 }).limit(500);
    }
    static async create(input) {
        if (!input.employeeId)
            throw ApiError_1.ApiError.badRequest('employeeId is required');
        if (!Object.values(types_1.EmployeeDeductionType).includes(input.type))
            throw ApiError_1.ApiError.badRequest('Invalid deduction type');
        if (!input.label?.trim())
            throw ApiError_1.ApiError.badRequest('A label is required');
        if (typeof input.totalAmount !== 'number' || input.totalAmount <= 0)
            throw ApiError_1.ApiError.badRequest('totalAmount must be greater than 0');
        const isInstallment = input.type === types_1.EmployeeDeductionType.LOAN || input.type === types_1.EmployeeDeductionType.ADVANCE;
        if (isInstallment) {
            if (!input.startDate)
                throw ApiError_1.ApiError.badRequest('startDate is required for loans and advances');
            const installment = input.monthlyInstallment && input.monthlyInstallment > 0 ? input.monthlyInstallment : input.totalAmount;
            if (installment > input.totalAmount)
                throw ApiError_1.ApiError.badRequest('monthlyInstallment cannot exceed totalAmount');
        }
        else if (!input.periodKey) {
            throw ApiError_1.ApiError.badRequest('periodKey (YYYY-MM) is required for penalties and other one-off deductions');
        }
        return EmployeeDeduction_1.EmployeeDeduction.create({
            employeeId: input.employeeId,
            type: input.type,
            label: input.label.trim(),
            totalAmount: round2(input.totalAmount),
            monthlyInstallment: isInstallment ? round2(input.monthlyInstallment && input.monthlyInstallment > 0 ? input.monthlyInstallment : input.totalAmount) : null,
            remainingBalance: isInstallment ? round2(input.totalAmount) : 0,
            startDate: isInstallment ? new Date(input.startDate) : null,
            periodKey: isInstallment ? null : input.periodKey,
            notes: input.notes,
            status: types_1.DeductionStatus.ACTIVE,
            createdBy: input.userId,
        });
    }
    static async cancel(id) {
        const doc = await EmployeeDeduction_1.EmployeeDeduction.findById(id);
        if (!doc)
            throw ApiError_1.ApiError.notFound('Deduction not found');
        if (doc.status === types_1.DeductionStatus.CANCELLED)
            throw ApiError_1.ApiError.badRequest('Deduction is already cancelled');
        doc.status = types_1.DeductionStatus.CANCELLED;
        await doc.save();
        return doc;
    }
}
exports.DeductionsService = DeductionsService;
//# sourceMappingURL=deductions.service.js.map