"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MS = exports.SiteCompensationService = void 0;
const GuardSiteCompensation_1 = require("../../models/GuardSiteCompensation");
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
    /** Full history for one site (newest first). */
    static async listForSite(siteId) {
        return GuardSiteCompensation_1.GuardSiteCompensation.find({ siteId }).sort({ effectiveFrom: -1 });
    }
    /** All sites' compensations (optionally only current rows), site populated. */
    static async listAll(opts = {}) {
        const query = {};
        if (opts.currentOnly)
            query.isCurrent = true;
        if (opts.siteId)
            query.siteId = opts.siteId;
        return GuardSiteCompensation_1.GuardSiteCompensation.find(query)
            .populate('siteId', 'siteName siteCode status')
            .sort({ effectiveFrom: -1 })
            .limit(1000);
    }
    /**
     * Record a new compensation amount for a site. The previous current row is
     * closed the day before the new row starts — history is never overwritten.
     */
    static async create(input) {
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
        if (current && current.effectiveFrom.getTime() > effectiveFrom.getTime()) {
            throw ApiError_1.ApiError.badRequest('A later compensation is already current — add a new row after its effective date');
        }
        if (current) {
            current.effectiveTo = new Date(effectiveFrom.getTime() - DAY_MS);
            current.isCurrent = false;
            current.updatedBy = input.userId;
            await current.save();
        }
        return GuardSiteCompensation_1.GuardSiteCompensation.create({
            siteId: input.siteId,
            compensationAmount: Math.round(input.compensationAmount * 100) / 100,
            effectiveFrom,
            effectiveTo: null,
            isCurrent: true,
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
            'primarySite.siteId': row.siteId,
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
            if (!result.has(key)) {
                result.set(key, row);
            }
        }
        return result;
    }
}
exports.SiteCompensationService = SiteCompensationService;
function ymKey(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
//# sourceMappingURL=siteCompensation.service.js.map