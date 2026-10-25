"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffPayrollEntriesService = void 0;
const StaffPayrollEntries_1 = require("../../models/StaffPayrollEntries");
const Employee_1 = require("../../models/Employee");
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
const AuditService_1 = require("../../core/audit/AuditService");
const types_2 = require("../../types");
function assertStaffEmployee(employeeId) {
    return Employee_1.Employee.findById(employeeId).then((e) => {
        if (!e)
            throw ApiError_1.ApiError.notFound('Employee not found');
        if (e.category !== types_1.EmployeeCategory.OFFICE_STAFF) {
            throw ApiError_1.ApiError.badRequest('Overtime and bonus entries are for OFFICE_STAFF employees only');
        }
        return e;
    });
}
function assertPeriodKey(periodKey) {
    if (!/^\d{4}-\d{2}$/.test(periodKey))
        throw ApiError_1.ApiError.badRequest('periodKey must be in YYYY-MM format');
}
/**
 * STAFF PAYROLL ENTRIES — period-keyed overtime and bonus inputs.
 * Both are upserted per employee+period: entering again for the same month
 * replaces the value. Neither changes Guard Payroll in any way.
 */
class StaffPayrollEntriesService {
    // ── Overtime (amount enters Gross AND Taxable earnings) ───────────
    static async listOvertime(filters = {}) {
        const query = {};
        if (filters.periodKey)
            query.periodKey = filters.periodKey;
        if (filters.employeeId)
            query.employeeId = filters.employeeId;
        return StaffPayrollEntries_1.StaffOvertimeEntry.find(query)
            .populate('employeeId', 'employeeCode firstName lastName')
            .sort({ periodKey: -1, 'employeeId.employeeCode': 1 })
            .limit(500);
    }
    static async saveOvertime(input, userId, auditCtx) {
        assertPeriodKey(input.periodKey);
        if (!input.employeeId)
            throw ApiError_1.ApiError.badRequest('employeeId is required');
        if (typeof input.amount !== 'number' || input.amount < 0)
            throw ApiError_1.ApiError.badRequest('amount must be a non-negative number');
        const employee = await assertStaffEmployee(input.employeeId);
        const doc = await StaffPayrollEntries_1.StaffOvertimeEntry.findOneAndUpdate({ employeeId: input.employeeId, periodKey: input.periodKey, status: types_2.DeductionStatus.ACTIVE }, {
            $set: {
                amount: input.amount,
                hours: input.hours ?? null,
                notes: input.notes?.trim() || undefined,
                createdBy: userId,
            },
        }, { upsert: true, new: true, setDefaultsOnInsert: true });
        await AuditService_1.AuditService.log({
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
    static async cancelOvertime(id, userId, auditCtx) {
        const doc = await StaffPayrollEntries_1.StaffOvertimeEntry.findById(id);
        if (!doc)
            throw ApiError_1.ApiError.notFound('Overtime entry not found');
        doc.status = types_2.DeductionStatus.CANCELLED;
        await doc.save();
        await AuditService_1.AuditService.log({
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
    static async listBonuses(filters = {}) {
        const query = {};
        if (filters.periodKey)
            query.periodKey = filters.periodKey;
        if (filters.employeeId)
            query.employeeId = filters.employeeId;
        return StaffPayrollEntries_1.StaffBonus.find(query)
            .populate('employeeId', 'employeeCode firstName lastName')
            .sort({ periodKey: -1, 'employeeId.employeeCode': 1 })
            .limit(500);
    }
    static async saveBonus(input, userId, auditCtx) {
        assertPeriodKey(input.periodKey);
        if (!input.employeeId)
            throw ApiError_1.ApiError.badRequest('employeeId is required');
        if (typeof input.amount !== 'number' || input.amount <= 0)
            throw ApiError_1.ApiError.badRequest('amount must be greater than 0');
        if (!input.label?.trim())
            throw ApiError_1.ApiError.badRequest('A label is required (e.g. "Annual bonus")');
        const employee = await assertStaffEmployee(input.employeeId);
        const doc = await StaffPayrollEntries_1.StaffBonus.create({
            employeeId: input.employeeId,
            periodKey: input.periodKey,
            amount: input.amount,
            label: input.label.trim(),
            createdBy: userId,
        });
        await AuditService_1.AuditService.log({
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
    static async cancelBonus(id, userId, auditCtx) {
        const doc = await StaffPayrollEntries_1.StaffBonus.findById(id);
        if (!doc)
            throw ApiError_1.ApiError.notFound('Bonus entry not found');
        doc.status = types_2.DeductionStatus.CANCELLED;
        await doc.save();
        await AuditService_1.AuditService.log({
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
exports.StaffPayrollEntriesService = StaffPayrollEntriesService;
//# sourceMappingURL=staffPayrollEntries.service.js.map