"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatutoryService = void 0;
const TaxBracket_1 = require("../../models/TaxBracket");
const PensionRule_1 = require("../../models/PensionRule");
const ApiError_1 = require("../../common/ApiError");
/**
 * GUARD rows: explicit 'GUARD' kind OR no kind at all (rows created before the
 * staff/guard split). STAFF rows: explicit 'STAFF' only.
 */
function kindFilter(kind) {
    return kind === 'STAFF' ? { kind: 'STAFF' } : { kind: { $in: ['GUARD', null, undefined] } };
}
/**
 * STATUTORY SERVICE — income tax and pension configuration/calculation shared
 * by payroll systems (guard payroll today, staff payroll later).
 *
 * Configuration is date-effective: a payroll period resolves the tax table and
 * pension rule that were in force at the start of that period, so changing the
 * rules never rewrites finalized payroll.
 */
class StatutoryService {
    /** Tax table in force at the given date (latest effectiveFrom wins). */
    static async getTaxTableForPeriod(periodStart, kind = 'GUARD') {
        return TaxBracket_1.TaxBracket.findOne({
            ...kindFilter(kind),
            effectiveFrom: { $lte: periodStart },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
        }).sort({ effectiveFrom: -1 });
    }
    /** Pension rule in force at the given date (latest effectiveFrom wins). */
    static async getPensionRuleForPeriod(periodStart, kind = 'GUARD') {
        return PensionRule_1.PensionRule.findOne({
            ...kindFilter(kind),
            effectiveFrom: { $lte: periodStart },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
        }).sort({ effectiveFrom: -1 });
    }
    /**
     * Progressive monthly income tax. Brackets are percentages; `max: null`
     * means "up to infinity". Gaps between brackets are treated as 0%.
     */
    static computeProgressiveTax(taxable, brackets) {
        if (!Number.isFinite(taxable) || taxable <= 0 || !brackets?.length)
            return 0;
        const sorted = [...brackets].sort((a, b) => a.min - b.min);
        let tax = 0;
        for (const bracket of sorted) {
            const upper = bracket.max === null || bracket.max === undefined ? Infinity : bracket.max;
            const portion = Math.min(taxable, upper) - bracket.min;
            if (portion > 0)
                tax += (portion * bracket.rate) / 100;
            if (taxable <= upper)
                break;
        }
        return Math.round(tax * 100) / 100;
    }
    /**
     * Employee/employer pension on a pensionable base, honouring optional
     * min/max pensionable-salary caps.
     */
    static computePension(base, rule) {
        let pensionable = Math.max(0, base);
        if (rule.minPensionableSalary !== null && rule.minPensionableSalary !== undefined) {
            pensionable = Math.max(pensionable, rule.minPensionableSalary);
        }
        if (rule.maxPensionableSalary !== null && rule.maxPensionableSalary !== undefined) {
            pensionable = Math.min(pensionable, rule.maxPensionableSalary);
        }
        const r2 = (n) => Math.round(n * 100) / 100;
        return {
            pensionableBase: r2(pensionable),
            employee: r2((pensionable * rule.employeePercent) / 100),
            employer: r2((pensionable * rule.employerPercent) / 100),
        };
    }
    // ───────────────────────────────────────────────────────────────────
    // Configuration CRUD (admin-facing)
    // ───────────────────────────────────────────────────────────────────
    static async listTaxTables(kind) {
        const filter = kind ? kindFilter(kind) : {};
        return TaxBracket_1.TaxBracket.find(filter).sort({ effectiveFrom: -1 });
    }
    static async createTaxTable(input) {
        if (!input.name?.trim())
            throw ApiError_1.ApiError.badRequest('Tax table name is required');
        if (!input.effectiveFrom)
            throw ApiError_1.ApiError.badRequest('effectiveFrom is required');
        if (!Array.isArray(input.brackets) || input.brackets.length === 0) {
            throw ApiError_1.ApiError.badRequest('At least one tax bracket is required');
        }
        for (const b of input.brackets) {
            if (typeof b.min !== 'number' || b.min < 0)
                throw ApiError_1.ApiError.badRequest('Bracket min must be a non-negative number');
            if (b.max !== null && (typeof b.max !== 'number' || b.max <= b.min))
                throw ApiError_1.ApiError.badRequest('Bracket max must be greater than min (or null)');
            if (typeof b.rate !== 'number' || b.rate < 0 || b.rate > 100)
                throw ApiError_1.ApiError.badRequest('Bracket rate must be between 0 and 100');
        }
        return TaxBracket_1.TaxBracket.create({
            name: input.name.trim(),
            kind: input.kind === 'STAFF' ? 'STAFF' : 'GUARD',
            effectiveFrom: new Date(input.effectiveFrom),
            effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
            brackets: input.brackets,
            createdBy: input.userId,
        });
    }
    static async listPensionRules(kind) {
        const filter = kind ? kindFilter(kind) : {};
        return PensionRule_1.PensionRule.find(filter).sort({ effectiveFrom: -1 });
    }
    static async createPensionRule(input) {
        if (!input.name?.trim())
            throw ApiError_1.ApiError.badRequest('Pension rule name is required');
        if (!input.effectiveFrom)
            throw ApiError_1.ApiError.badRequest('effectiveFrom is required');
        if (typeof input.employeePercent !== 'number' || input.employeePercent < 0 || input.employeePercent > 100) {
            throw ApiError_1.ApiError.badRequest('employeePercent must be between 0 and 100');
        }
        if (typeof input.employerPercent !== 'number' || input.employerPercent < 0 || input.employerPercent > 100) {
            throw ApiError_1.ApiError.badRequest('employerPercent must be between 0 and 100');
        }
        return PensionRule_1.PensionRule.create({
            name: input.name.trim(),
            kind: input.kind === 'STAFF' ? 'STAFF' : 'GUARD',
            employeePercent: input.employeePercent,
            employerPercent: input.employerPercent,
            minPensionableSalary: input.minPensionableSalary ?? null,
            maxPensionableSalary: input.maxPensionableSalary ?? null,
            effectiveFrom: new Date(input.effectiveFrom),
            effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
            createdBy: input.userId,
        });
    }
}
exports.StatutoryService = StatutoryService;
//# sourceMappingURL=statutory.service.js.map