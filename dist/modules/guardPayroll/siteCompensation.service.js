"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MS = exports.SiteCompensationService = void 0;
const payrollTransaction_1 = require("./payrollTransaction");
const GuardSiteCompensation_1 = require("../../models/GuardSiteCompensation");
const guardPayrollConfig_service_1 = require("./guardPayrollConfig.service");
const GuardPayrollRecord_1 = require("../../models/GuardPayrollRecord");
const Site_1 = require("../../models/Site");
const ApiError_1 = require("../../common/ApiError");
const DAY_MS = 24 * 60 * 60 * 1000;
exports.DAY_MS = DAY_MS;
/**
 * SITE COMPENSATION SERVICE — effective-dated agreed compensation per site.
 *
 * The compensation amount is the payroll source of truth. Historical payroll
 * stays accurate because each payroll record snapshots the amount used, and
 * lookups always resolve the row that was in force for the payroll month.
 */
class SiteCompensationService {
    /** Effective formula numbers for one compensation row (per-site overrides · global config fallback). */
    static async formulaFor(row) {
        const global = await guardPayrollConfig_service_1.GuardPayrollConfigService.getNumbers();
        return {
            transportPercent: row.formula?.transportPercent ?? global.transportPercent,
            standardMonthlyHours: row.formula?.standardMonthlyHours ?? global.standardMonthlyHours,
            sundayStructuralHours: row.formula?.sundayStructuralHours ?? global.sundayStructuralHours,
            basicHourlyDivisor: row.formula?.basicHourlyDivisor ?? global.basicHourlyDivisor,
        };
    }
    /** Batched per-site formula numbers: Map<siteIdString, ISiteFormulaOverride>. */
    static async formulaForSites(rows) {
        const needsGlobal = rows.some((r) => r.formula?.transportPercent === undefined ||
            r.formula?.standardMonthlyHours === undefined ||
            r.formula?.sundayStructuralHours === undefined ||
            r.formula?.basicHourlyDivisor === undefined);
        const global = needsGlobal ? await guardPayrollConfig_service_1.GuardPayrollConfigService.getNumbers() : null;
        const result = new Map();
        for (const row of rows) {
            result.set(row.siteId.toString(), {
                transportPercent: row.formula?.transportPercent ?? global?.transportPercent,
                standardMonthlyHours: row.formula?.standardMonthlyHours ?? global?.standardMonthlyHours,
                sundayStructuralHours: row.formula?.sundayStructuralHours ?? global?.sundayStructuralHours,
                basicHourlyDivisor: row.formula?.basicHourlyDivisor ?? global?.basicHourlyDivisor,
            });
        }
        return result;
    }
    /** Full history for one site (newest first), formula values resolved. */
    static async listForSite(siteId) {
        const rows = await GuardSiteCompensation_1.GuardSiteCompensation.find({ siteId }).sort({ effectiveFrom: -1 });
        const formulas = await this.formulaForSites(rows);
        return rows.map((row) => {
            const doc = row.toObject();
            doc.formula = formulas.get(row.siteId.toString());
            return doc;
        });
    }
    /** All sites' compensations (optionally only current rows), site populated, formula values resolved. */
    static async listAll(opts = {}) {
        const query = {};
        if (opts.currentOnly)
            query.isCurrent = true;
        if (opts.siteId)
            query.siteId = opts.siteId;
        const rows = await GuardSiteCompensation_1.GuardSiteCompensation.find(query)
            .populate('siteId', 'siteName siteCode status')
            .sort({ effectiveFrom: -1 })
            .limit(1000);
        const formulas = await this.formulaForSites(rows);
        return rows.map((row) => {
            const doc = row.toObject();
            doc.formula = formulas.get(row.siteId.toString());
            return doc;
        });
    }
    /**
     * Record a new compensation amount for a site. The previous current row is
     * closed the day before the new row starts — history is never overwritten.
     */
    static async create(input) {
        return (0, payrollTransaction_1.payrollTransaction)(async () => {
            await Site_1.Site.updateOne({ _id: input.siteId }, { $inc: { __v: 1 } });
            return this.createTransactional(input);
        });
    }
    static async createTransactional(input) {
        if (!input.siteId)
            throw ApiError_1.ApiError.badRequest('siteId is required');
        if (typeof input.compensationAmount !== 'number' || !Number.isFinite(input.compensationAmount) || input.compensationAmount <= 0) {
            throw ApiError_1.ApiError.badRequest('compensationAmount must be greater than 0');
        }
        if (!input.effectiveFrom)
            throw ApiError_1.ApiError.badRequest('effectiveFrom is required');
        const effectiveFrom = new Date(input.effectiveFrom);
        if (isNaN(effectiveFrom.getTime()))
            throw ApiError_1.ApiError.badRequest('effectiveFrom is not a valid date');
        const site = await Site_1.Site.findById(input.siteId);
        if (!site)
            throw ApiError_1.ApiError.notFound('Site not found');
        const current = await GuardSiteCompensation_1.GuardSiteCompensation.findOne({ siteId: input.siteId, isCurrent: true });
        // Self-heal on every write: a site must hold exactly ONE current rate. If
        // stray legacy/raced rows are also flagged current for this site, retire
        // them so the unique index and lookups stay unambiguous. History rows are
        // never deleted; the row we go on to amend/create remains the rate in force.
        const strayQuery = current
            ? { siteId: input.siteId, isCurrent: true, _id: { $ne: current._id } }
            : { siteId: input.siteId, isCurrent: true };
        const strays = await GuardSiteCompensation_1.GuardSiteCompensation.updateMany(strayQuery, { $set: { isCurrent: false } });
        if (strays.modifiedCount > 0) {
            console.warn(`[siteCompensation] Retired ${strays.modifiedCount} duplicate current rate(s) for site ${input.siteId} before recording a new rate`);
        }
        // Same-day correction: the current row starts on this same date, so the
        // "later compensation" rule does not apply — amend the current row itself
        // and keep an audit trail, instead of erroring on every repeated edit.
        if (current && ymd(current.effectiveFrom) === ymd(effectiveFrom)) {
            if (current.compensationAmount === Math.round(input.compensationAmount * 100) / 100 && !hasFormulaDelta(current.formula, input.formula)) {
                return current; // No effective change — idempotent retry.
            }
            current.changeHistory.push({
                previousAmount: current.compensationAmount,
                newAmount: Math.round(input.compensationAmount * 100) / 100,
                previousFormula: current.formula || null,
                newFormula: input.formula || null,
                reason: input.reason || input.notes,
                changedBy: input.userId,
                changedAt: new Date(),
            });
            current.compensationAmount = Math.round(input.compensationAmount * 100) / 100;
            if (input.formula !== undefined)
                current.formula = Object.keys(normalizeFormula(input.formula)).length ? normalizeFormula(input.formula) : null;
            if (input.notes !== undefined)
                current.notes = input.notes;
            current.updatedBy = input.userId;
            await current.save();
            return current;
        }
        if (current && current.effectiveFrom.getTime() >= effectiveFrom.getTime()) {
            throw ApiError_1.ApiError.badRequest('A later compensation is already current — add a new row after its effective date');
        }
        if (current) {
            current.effectiveTo = new Date(effectiveFrom.getTime() - DAY_MS);
            current.isCurrent = false;
            current.updatedBy = input.userId;
            await current.save();
        }
        // Only the supplied per-site values are stored; missing ones stay
        // undefined and resolve to the global config at calculation time.
        const formula = input.formula ? normalizeFormula(input.formula) : undefined;
        return GuardSiteCompensation_1.GuardSiteCompensation.create({
            siteId: input.siteId,
            compensationAmount: Math.round(input.compensationAmount * 100) / 100,
            effectiveFrom,
            effectiveTo: null,
            isCurrent: true,
            ...(formula ? { formula } : {}),
            notes: input.notes,
            createdBy: input.userId,
            updatedBy: input.userId,
        });
    }
    /**
     * Delete a compensation row. Only allowed when it is NOT the current row and
     * no payroll record was calculated with it.
     */
    static async remove(id) {
        const row = await GuardSiteCompensation_1.GuardSiteCompensation.findById(id);
        if (!row)
            throw ApiError_1.ApiError.notFound('Compensation row not found');
        if (row.isCurrent) {
            throw ApiError_1.ApiError.badRequest('The current compensation cannot be deleted — record a new amount instead');
        }
        const used = await GuardPayrollRecord_1.GuardPayrollRecord.exists({
            $or: [{ 'primarySite.siteId': row.siteId }, { 'additionalSites.siteId': row.siteId }],
            periodKey: { $gte: ymKey(row.effectiveFrom) },
        });
        if (used)
            throw ApiError_1.ApiError.badRequest('This compensation was already used by a payroll run and cannot be deleted');
        await row.deleteOne();
        return row;
    }
    /**
     * The compensation in force for a site across a payroll month window.
     * Throws when missing or when rows overlap (bad configuration).
     */
    static async resolveForPeriod(siteId, periodStart, periodEnd) {
        const rows = await GuardSiteCompensation_1.GuardSiteCompensation.find({
            siteId,
            effectiveFrom: { $lte: periodEnd },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
        }).sort({ effectiveFrom: -1 });
        if (rows.length === 0) {
            throw ApiError_1.ApiError.badRequest('No site compensation is configured for this payroll period');
        }
        if (rows.length > 1) {
            throw ApiError_1.ApiError.badRequest('Overlapping site compensation rows are configured for this period — fix the site compensation history');
        }
        return rows[0];
    }
    /**
     * Batch lookup of compensations for multiple sites in a payroll window.
     * Returns Map<siteIdString, IGuardSiteCompensation>.
     */
    static async getForSites(siteIds, periodStart, periodEnd) {
        const end = periodEnd || new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
        const rows = await GuardSiteCompensation_1.GuardSiteCompensation.find({
            siteId: { $in: siteIds },
            effectiveFrom: { $lte: end },
            $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
        }).sort({ effectiveFrom: -1 });
        const result = new Map();
        for (const row of rows) {
            const key = row.siteId.toString();
            if (result.has(key)) {
                throw ApiError_1.ApiError.badRequest(`Site ${key} has multiple compensation rates in this payroll month. Resolve overlapping history or use segmented payroll for a mid-month rate change; no rate was selected arbitrarily.`);
            }
            result.set(key, row);
        }
        return result;
    }
}
exports.SiteCompensationService = SiteCompensationService;
function ymd(d) {
    // Effective dates arrive as UTC date-only strings; compare in UTC so a
    // non-UTC server timezone cannot shift the same-day check by a day.
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
/** True when the new formula changes any value that the row currently overrides. */
function hasFormulaDelta(currentFormula, next) {
    if (next === undefined)
        return false;
    if (!next)
        return !!currentFormula; // clearing values → change
    return ['transportPercent', 'standardMonthlyHours', 'sundayStructuralHours', 'basicHourlyDivisor'].some((k) => next[k] !== undefined && next[k] !== currentFormula?.[k]);
}
/** Keep only finite, in-bounds values supplied for the per-site formula. */
function normalizeFormula(f) {
    if (!f)
        return {};
    const out = {};
    const bounds = [
        ['transportPercent', 0, 100],
        ['standardMonthlyHours', 1, 744],
        ['sundayStructuralHours', 0, 200],
        ['basicHourlyDivisor', 1, 744],
    ];
    for (const [key, min, max] of bounds) {
        const raw = f[key];
        if (raw === undefined || raw === null || raw === '')
            continue;
        const value = Number(raw);
        if (!Number.isFinite(value))
            throw ApiError_1.ApiError.badRequest(`Formula ${key} must be a number`);
        if (value < min || value > max)
            throw ApiError_1.ApiError.badRequest(`Formula ${key} must be between ${min} and ${max}`);
        out[key] = value;
    }
    return out;
}
function ymKey(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
//# sourceMappingURL=siteCompensation.service.js.map