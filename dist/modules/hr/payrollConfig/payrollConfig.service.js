"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollConfigService = void 0;
const SalaryComponent_1 = require("../../../models/SalaryComponent");
const PayrollFormulaVersion_1 = require("../../../models/PayrollFormulaVersion");
const TaxBracket_1 = require("../../../models/TaxBracket");
const PensionRule_1 = require("../../../models/PensionRule");
const ApiError_1 = require("../../../common/ApiError");
const AuditService_1 = require("../../../core/audit/AuditService");
class PayrollConfigService {
    // ── Salary Components ──
    static async getComponents(includeInactive = false) {
        const filter = {};
        if (!includeInactive)
            filter.active = true;
        return SalaryComponent_1.SalaryComponent.find(filter).sort({ code: 1 });
    }
    static async getComponentById(id) {
        const comp = await SalaryComponent_1.SalaryComponent.findById(id);
        if (!comp)
            throw ApiError_1.ApiError.notFound('Salary component not found');
        return comp;
    }
    static async createComponent(data, auditCtx) {
        const existing = await SalaryComponent_1.SalaryComponent.findOne({ code: data.code.toUpperCase() });
        if (existing)
            throw ApiError_1.ApiError.conflict(`Component with code "${data.code}" already exists`);
        const comp = await SalaryComponent_1.SalaryComponent.create({
            code: data.code.toUpperCase(),
            label: data.label,
            sourceType: data.sourceType,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'PAYROLL_COMPONENT_CREATE',
            entity: 'SalaryComponent',
            entityId: comp._id.toString(),
            newValues: { code: comp.code, label: comp.label, sourceType: comp.sourceType },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return comp;
    }
    static async updateComponent(id, data, auditCtx) {
        const comp = await SalaryComponent_1.SalaryComponent.findById(id);
        if (!comp)
            throw ApiError_1.ApiError.notFound('Salary component not found');
        if (data.sourceType && data.sourceType !== comp.sourceType) {
            const usedInFormula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({
                $or: [
                    { grossComponentCodes: comp.code },
                    { taxableComponentCodes: comp.code },
                    { pensionBaseComponentCodes: comp.code },
                    { deductionComponentCodes: comp.code },
                ],
            });
            if (usedInFormula) {
                throw ApiError_1.ApiError.badRequest(`Cannot change sourceType of "${comp.code}" — it is referenced in formula version ${usedInFormula.version}. ` +
                    `Retire this component and create a new one with the correct sourceType instead.`);
            }
        }
        const oldValues = {};
        if (data.label !== undefined) {
            oldValues.label = comp.label;
            comp.label = data.label;
        }
        if (data.sourceType !== undefined) {
            oldValues.sourceType = comp.sourceType;
            comp.sourceType = data.sourceType;
        }
        if (data.active !== undefined) {
            oldValues.active = comp.active;
            comp.active = data.active;
        }
        await comp.save();
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'PAYROLL_COMPONENT_UPDATE',
            entity: 'SalaryComponent',
            entityId: id,
            oldValues,
            newValues: data,
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return comp;
    }
    static async retireComponent(id, auditCtx) {
        const comp = await SalaryComponent_1.SalaryComponent.findById(id);
        if (!comp)
            throw ApiError_1.ApiError.notFound('Salary component not found');
        if (!comp.active)
            throw ApiError_1.ApiError.badRequest('Component is already retired');
        comp.active = false;
        await comp.save();
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'PAYROLL_COMPONENT_RETIRE',
            entity: 'SalaryComponent',
            entityId: id,
            newValues: { code: comp.code, active: false },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return comp;
    }
    // ── Payroll Formula Versions ──
    static async getCurrentFormula() {
        return PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ isCurrent: true });
    }
    static async getFormulaVersion(version) {
        const formula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ version });
        if (!formula)
            throw ApiError_1.ApiError.notFound(`Formula version ${version} not found`);
        return formula;
    }
    static async getAllFormulas() {
        return PayrollFormulaVersion_1.PayrollFormulaVersion.find().sort({ version: -1 });
    }
    static async createFormula(data, auditCtx) {
        const effectiveFrom = new Date(data.effectiveFrom);
        effectiveFrom.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (effectiveFrom < today) {
            throw ApiError_1.ApiError.badRequest('effectiveFrom must be today or a future date');
        }
        const activeComponents = await SalaryComponent_1.SalaryComponent.find({ active: true });
        const activeCodes = new Set(activeComponents.map((c) => c.code));
        const allCodes = [
            ...data.grossComponentCodes,
            ...data.taxableComponentCodes,
            ...data.pensionBaseComponentCodes,
            ...data.deductionComponentCodes,
        ];
        for (const code of allCodes) {
            if (!activeCodes.has(code)) {
                throw ApiError_1.ApiError.badRequest(`Component "${code}" is not active or does not exist`);
            }
        }
        if (!data.grossComponentCodes.includes('BASIC')) {
            AuditService_1.AuditService.log({
                userId: auditCtx.userId,
                action: 'PAYROLL_FORMULA_WARNING',
                entity: 'PayrollFormulaVersion',
                newValues: { warning: 'BASIC excluded from gross components' },
                ipAddress: auditCtx.ip,
                userAgent: auditCtx.ua,
            });
        }
        const maxVersion = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne().sort({ version: -1 });
        const nextVersion = (maxVersion?.version || 0) + 1;
        const currentFormula = await PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ isCurrent: true });
        if (currentFormula) {
            currentFormula.isCurrent = false;
            currentFormula.effectiveTo = new Date();
            await currentFormula.save();
        }
        const formula = await PayrollFormulaVersion_1.PayrollFormulaVersion.create({
            version: nextVersion,
            isCurrent: true,
            effectiveFrom,
            grossComponentCodes: data.grossComponentCodes,
            taxableComponentCodes: data.taxableComponentCodes,
            pensionBaseComponentCodes: data.pensionBaseComponentCodes,
            deductionComponentCodes: data.deductionComponentCodes,
            createdById: auditCtx.userId,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'PAYROLL_FORMULA_CREATE',
            entity: 'PayrollFormulaVersion',
            entityId: formula._id.toString(),
            newValues: {
                version: nextVersion,
                effectiveFrom,
                gross: data.grossComponentCodes,
                taxable: data.taxableComponentCodes,
                pensionBase: data.pensionBaseComponentCodes,
                deductions: data.deductionComponentCodes,
            },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return formula;
    }
    // ── Tax Brackets ──
    static async getTaxBrackets() {
        return TaxBracket_1.TaxBracket.find().sort({ effectiveFrom: -1 });
    }
    static async getCurrentTaxBracket() {
        return TaxBracket_1.TaxBracket.findOne({ isCurrent: true });
    }
    static async createTaxBracket(data, auditCtx) {
        const effectiveFrom = new Date(data.effectiveFrom);
        const current = await TaxBracket_1.TaxBracket.findOne({ isCurrent: true });
        if (current) {
            current.isCurrent = false;
            current.effectiveTo = effectiveFrom;
            await current.save();
        }
        const bracket = await TaxBracket_1.TaxBracket.create({
            label: data.label,
            brackets: data.brackets,
            effectiveFrom,
            isCurrent: true,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'TAX_BRACKET_CREATE',
            entity: 'TaxBracket',
            entityId: bracket._id.toString(),
            newValues: { label: data.label, bracketCount: data.brackets.length },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return bracket;
    }
    // ── Pension Rules ──
    static async getPensionRules() {
        return PensionRule_1.PensionRule.find().sort({ effectiveFrom: -1 });
    }
    static async getCurrentPensionRule() {
        return PensionRule_1.PensionRule.findOne({ isCurrent: true });
    }
    static async createPensionRule(data, auditCtx) {
        const effectiveFrom = new Date(data.effectiveFrom);
        const current = await PensionRule_1.PensionRule.findOne({ isCurrent: true });
        if (current) {
            current.isCurrent = false;
            current.effectiveTo = effectiveFrom;
            await current.save();
        }
        const rule = await PensionRule_1.PensionRule.create({
            label: data.label,
            employeeRate: data.employeeRate,
            employerRate: data.employerRate,
            effectiveFrom,
            isCurrent: true,
        });
        AuditService_1.AuditService.log({
            userId: auditCtx.userId,
            action: 'PENSION_RULE_CREATE',
            entity: 'PensionRule',
            entityId: rule._id.toString(),
            newValues: { label: data.label, employeeRate: data.employeeRate, employerRate: data.employerRate },
            ipAddress: auditCtx.ip,
            userAgent: auditCtx.ua,
        });
        return rule;
    }
    // ── Dashboard ──
    static async getConfigDashboard() {
        const [components, currentFormula, currentTax, currentPension, formulaCount] = await Promise.all([
            SalaryComponent_1.SalaryComponent.find({ active: true }).sort({ code: 1 }),
            PayrollFormulaVersion_1.PayrollFormulaVersion.findOne({ isCurrent: true }),
            TaxBracket_1.TaxBracket.findOne({ isCurrent: true }),
            PensionRule_1.PensionRule.findOne({ isCurrent: true }),
            PayrollFormulaVersion_1.PayrollFormulaVersion.countDocuments(),
        ]);
        return {
            components,
            currentFormula,
            currentTax,
            currentPension,
            formulaCount,
        };
    }
}
exports.PayrollConfigService = PayrollConfigService;
//# sourceMappingURL=payrollConfig.service.js.map