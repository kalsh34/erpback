import mongoose from 'mongoose';
import { payrollTransaction } from './payrollTransaction';
import { GuardSiteCompensation, IGuardSiteCompensation, ISiteFormulaOverride } from '../../models/GuardSiteCompensation';
import { GuardPayrollConfigService } from './guardPayrollConfig.service';
import { GuardPayrollRecord } from '../../models/GuardPayrollRecord';
import { Site } from '../../models/Site';
import { ApiError } from '../../common/ApiError';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * SITE COMPENSATION SERVICE — effective-dated agreed compensation per site.
 *
 * The compensation amount is the payroll source of truth. Historical payroll
 * stays accurate because each payroll record snapshots the amount used, and
 * lookups always resolve the row that was in force for the payroll month.
 */
export class SiteCompensationService {
  /** Effective formula numbers for one compensation row (per-site overrides · global config fallback). */
  static async formulaFor(row: IGuardSiteCompensation): Promise<ISiteFormulaOverride> {
    const global = await GuardPayrollConfigService.getNumbers();
    return {
      transportPercent: row.formula?.transportPercent ?? global.transportPercent,
      standardMonthlyHours: row.formula?.standardMonthlyHours ?? global.standardMonthlyHours,
      sundayStructuralHours: row.formula?.sundayStructuralHours ?? global.sundayStructuralHours,
      basicHourlyDivisor: row.formula?.basicHourlyDivisor ?? global.basicHourlyDivisor,
    };
  }

  /** Batched per-site formula numbers: Map<siteIdString, ISiteFormulaOverride>. */
  static async formulaForSites(rows: IGuardSiteCompensation[]): Promise<Map<string, ISiteFormulaOverride>> {
    const needsGlobal = rows.some((r) =>
      r.formula?.transportPercent === undefined ||
      r.formula?.standardMonthlyHours === undefined ||
      r.formula?.sundayStructuralHours === undefined ||
      r.formula?.basicHourlyDivisor === undefined);
    const global = needsGlobal ? await GuardPayrollConfigService.getNumbers() : null;
    const result = new Map<string, ISiteFormulaOverride>();
    for (const row of rows) {
      result.set(row.siteId.toString(), {
        transportPercent: row.formula?.transportPercent ?? global?.transportPercent!,
        standardMonthlyHours: row.formula?.standardMonthlyHours ?? global?.standardMonthlyHours!,
        sundayStructuralHours: row.formula?.sundayStructuralHours ?? global?.sundayStructuralHours!,
        basicHourlyDivisor: row.formula?.basicHourlyDivisor ?? global?.basicHourlyDivisor!,
      });
    }
    return result;
  }

  /** Full history for one site (newest first), formula values resolved. */
  static async listForSite(siteId: string) {
    const rows = await GuardSiteCompensation.find({ siteId }).sort({ effectiveFrom: -1 });
    const formulas = await this.formulaForSites(rows);
    return rows.map((row) => {
      const doc = row.toObject();
      (doc as any).formula = formulas.get(row.siteId.toString());
      return doc as IGuardSiteCompensation & { formula: ISiteFormulaOverride };
    });
  }

  /** All sites' compensations (optionally only current rows), site populated, formula values resolved. */
  static async listAll(opts: { currentOnly?: boolean; siteId?: string } = {}) {
    const query: Record<string, unknown> = {};
    if (opts.currentOnly) query.isCurrent = true;
    if (opts.siteId) query.siteId = opts.siteId;
    const rows = await GuardSiteCompensation.find(query)
      .populate('siteId', 'siteName siteCode status')
      .sort({ effectiveFrom: -1 })
      .limit(1000);
    const formulas = await this.formulaForSites(rows);
    return rows.map((row) => {
      const doc = row.toObject();
      (doc as any).formula = formulas.get(row.siteId.toString());
      return doc as typeof row & { formula: ISiteFormulaOverride };
    });
  }

  /**
   * Record a new compensation amount for a site. The previous current row is
   * closed the day before the new row starts — history is never overwritten.
   */
  static async create(input: { siteId: string; compensationAmount: number; effectiveFrom: string; notes?: string; formula?: ISiteFormulaOverride | null; reason?: string; userId: string }) {
    return payrollTransaction(async () => {
      await Site.updateOne({ _id: input.siteId }, { $inc: { __v: 1 } });
      return this.createTransactional(input);
    });
  }
  private static async createTransactional(input: { siteId: string; compensationAmount: number; effectiveFrom: string; notes?: string; formula?: ISiteFormulaOverride | null; reason?: string; userId: string }) {
    if (!input.siteId) throw ApiError.badRequest('siteId is required');
    if (typeof input.compensationAmount !== 'number' || !Number.isFinite(input.compensationAmount) || input.compensationAmount <= 0) {
      throw ApiError.badRequest('compensationAmount must be greater than 0');
    }
    if (!input.effectiveFrom) throw ApiError.badRequest('effectiveFrom is required');
    const effectiveFrom = new Date(input.effectiveFrom);
    if (isNaN(effectiveFrom.getTime())) throw ApiError.badRequest('effectiveFrom is not a valid date');

    const site = await Site.findById(input.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const current = await GuardSiteCompensation.findOne({ siteId: input.siteId, isCurrent: true });

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
        previousFormula: (current.formula as any) || null,
        newFormula: (input.formula as any) || null,
        reason: input.reason || input.notes,
        changedBy: input.userId as any,
        changedAt: new Date(),
      });
      current.compensationAmount = Math.round(input.compensationAmount * 100) / 100;
      if (input.formula !== undefined) current.formula = Object.keys(normalizeFormula(input.formula)).length ? normalizeFormula(input.formula) as any : null;
      if (input.notes !== undefined) current.notes = input.notes;
      current.updatedBy = input.userId as any;
      await current.save();
      return current;
    }

    if (current && current.effectiveFrom.getTime() >= effectiveFrom.getTime()) {
      throw ApiError.badRequest('A later compensation is already current — add a new row after its effective date');
    }

    if (current) {
      current.effectiveTo = new Date(effectiveFrom.getTime() - DAY_MS);
      current.isCurrent = false;
      current.updatedBy = input.userId as any;
      await current.save();
    }

    // Only the supplied per-site values are stored; missing ones stay
    // undefined and resolve to the global config at calculation time.
    const formula = input.formula ? normalizeFormula(input.formula) : undefined;

    return GuardSiteCompensation.create({
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
  static async remove(id: string) {
    const row = await GuardSiteCompensation.findById(id);
    if (!row) throw ApiError.notFound('Compensation row not found');
    if (row.isCurrent) {
      throw ApiError.badRequest('The current compensation cannot be deleted — record a new amount instead');
    }
    const used = await GuardPayrollRecord.exists({
      $or: [{ 'primarySite.siteId': row.siteId }, { 'additionalSites.siteId': row.siteId }],
      periodKey: { $gte: ymKey(row.effectiveFrom) },
    });
    if (used) throw ApiError.badRequest('This compensation was already used by a payroll run and cannot be deleted');
    await row.deleteOne();
    return row;
  }

  /**
   * The compensation in force for a site across a payroll month window.
   * Throws when missing or when rows overlap (bad configuration).
   */
  static async resolveForPeriod(siteId: string, periodStart: Date, periodEnd: Date): Promise<IGuardSiteCompensation> {
    const rows = await GuardSiteCompensation.find({
      siteId,
      effectiveFrom: { $lte: periodEnd },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
    }).sort({ effectiveFrom: -1 });

    if (rows.length === 0) {
      throw ApiError.badRequest('No site compensation is configured for this payroll period');
    }
    if (rows.length > 1) {
      throw ApiError.badRequest('Overlapping site compensation rows are configured for this period — fix the site compensation history');
    }
    return rows[0];
  }

  /**
   * Batch lookup of compensations for multiple sites in a payroll window.
   * Returns Map<siteIdString, IGuardSiteCompensation>.
   */
  static async getForSites(siteIds: string[], periodStart: Date, periodEnd?: Date): Promise<Map<string, IGuardSiteCompensation>> {
    const end = periodEnd || new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59, 999);
    const rows = await GuardSiteCompensation.find({
      siteId: { $in: siteIds },
      effectiveFrom: { $lte: end },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: periodStart } }],
    }).sort({ effectiveFrom: -1 });

    const result = new Map<string, IGuardSiteCompensation>();
    for (const row of rows) {
      const key = row.siteId.toString();
      if (result.has(key)) {
        throw ApiError.badRequest(`Site ${key} has multiple compensation rates in this payroll month. Resolve overlapping history or use segmented payroll for a mid-month rate change; no rate was selected arbitrarily.`);
      }
      result.set(key, row);
    }
    return result;
  }
}


function ymd(d: Date): string {
  // Effective dates arrive as UTC date-only strings; compare in UTC so a
  // non-UTC server timezone cannot shift the same-day check by a day.
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** True when the new formula changes any value that the row currently overrides. */
function hasFormulaDelta(currentFormula: ISiteFormulaOverride | null | undefined, next?: ISiteFormulaOverride | null): boolean {
  if (next === undefined) return false;
  if (!next) return !!currentFormula; // clearing values → change
  return ['transportPercent', 'standardMonthlyHours', 'sundayStructuralHours', 'basicHourlyDivisor'].some(
    (k) => (next as any)[k] !== undefined && (next as any)[k] !== (currentFormula as any)?.[k]
  );
}

/** Keep only finite, in-bounds values supplied for the per-site formula. */
function normalizeFormula(f?: ISiteFormulaOverride | null): ISiteFormulaOverride {
  if (!f) return {};
  const out: ISiteFormulaOverride = {};
  const bounds: [keyof ISiteFormulaOverride, number, number][] = [
    ['transportPercent', 0, 100],
    ['standardMonthlyHours', 1, 744],
    ['sundayStructuralHours', 0, 200],
    ['basicHourlyDivisor', 1, 744],
  ];
  for (const [key, min, max] of bounds) {
    const raw = (f as any)[key];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw ApiError.badRequest(`Formula ${key} must be a number`);
    if (value < min || value > max) throw ApiError.badRequest(`Formula ${key} must be between ${min} and ${max}`);
    out[key] = value;
  }
  return out;
}

function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export { DAY_MS };
