"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollCommonController = void 0;
const statutory_service_1 = require("./statutory.service");
const deductions_service_1 = require("./deductions.service");
const ApiError_1 = require("../../common/ApiError");
const AuditService_1 = require("../../core/audit/AuditService");
/** Shared payroll configuration endpoints: tax tables, pension rules, deductions. */
class PayrollCommonController {
    // ── Tax tables ─────────────────────────────────────────────────────
    static async listTaxTables(req, res, next) {
        try {
            const kind = req.query.kind === 'STAFF' ? 'STAFF' : req.query.kind === 'GUARD' ? 'GUARD' : undefined;
            res.json({ success: true, data: await statutory_service_1.StatutoryService.listTaxTables(kind) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createTaxTable(req, res, next) {
        try {
            const table = await statutory_service_1.StatutoryService.createTaxTable({ ...req.body, userId: req.user?.userId || '' });
            await AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'TAX_TABLE_CREATE',
                entity: 'TaxBracket',
                entityId: table._id.toString(),
                newValues: { name: table.name, effectiveFrom: table.effectiveFrom, brackets: table.brackets.length },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: table });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Pension rules ──────────────────────────────────────────────────
    static async listPensionRules(req, res, next) {
        try {
            const kind = req.query.kind === 'STAFF' ? 'STAFF' : req.query.kind === 'GUARD' ? 'GUARD' : undefined;
            res.json({ success: true, data: await statutory_service_1.StatutoryService.listPensionRules(kind) });
        }
        catch (error) {
            next(error);
        }
    }
    static async createPensionRule(req, res, next) {
        try {
            const rule = await statutory_service_1.StatutoryService.createPensionRule({ ...req.body, userId: req.user?.userId || '' });
            await AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'PENSION_RULE_CREATE',
                entity: 'PensionRule',
                entityId: rule._id.toString(),
                newValues: { name: rule.name, employeePercent: rule.employeePercent, employerPercent: rule.employerPercent },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: rule });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Deductions ─────────────────────────────────────────────────────
    static async listDeductions(req, res, next) {
        try {
            const { employeeId, status } = req.query;
            res.json({
                success: true,
                data: await deductions_service_1.DeductionsService.list({
                    employeeId: employeeId,
                    status: status,
                }),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createDeduction(req, res, next) {
        try {
            if (!req.body.employeeId)
                throw ApiError_1.ApiError.badRequest('employeeId is required');
            const doc = await deductions_service_1.DeductionsService.create({ ...req.body, userId: req.user?.userId || '' });
            await AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'EMPLOYEE_DEDUCTION_CREATE',
                entity: 'EmployeeDeduction',
                entityId: doc._id.toString(),
                newValues: { employeeId: doc.employeeId.toString(), type: doc.type, label: doc.label, totalAmount: doc.totalAmount },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.status(201).json({ success: true, data: doc });
        }
        catch (error) {
            next(error);
        }
    }
    static async cancelDeduction(req, res, next) {
        try {
            const doc = await deductions_service_1.DeductionsService.cancel(req.params.id);
            await AuditService_1.AuditService.log({
                userId: req.user?.userId || '',
                action: 'EMPLOYEE_DEDUCTION_CANCEL',
                entity: 'EmployeeDeduction',
                entityId: doc._id.toString(),
                newValues: { status: doc.status },
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
            });
            res.json({ success: true, data: doc });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PayrollCommonController = PayrollCommonController;
//# sourceMappingURL=payrollCommon.controller.js.map