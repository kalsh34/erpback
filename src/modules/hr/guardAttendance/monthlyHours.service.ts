import mongoose from 'mongoose';
import { GuardMonthlyHours, IGuardMonthlyHours } from '../../../models/GuardMonthlyHours';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { Employee } from '../../../models/Employee';
import { Site } from '../../../models/Site';
import { GuardAttendanceRecord } from '../../../models/GuardAttendanceRecord';
import { GuardAttendanceStatus, EmployeeCategory } from '../../../types';
import { ApiError } from '../../../common/ApiError';
import { AuditService } from '../../../core/audit/AuditService';
import { GuardPayrollLockService } from '../../guardPayroll/guardPayrollLock.service';
import { startOfDay, round2 } from './monthlyHours.helpers';

export interface MonthlyHoursBucket {
  normalHours: number;
  holidayHours: number;
  sundayHours: number;
}

interface AuditCtx { ip?: string; ua?: string }

const MAX_MONTHLY_HOURS = 744; // sanity cap (longest month = 31 × 24h)

const ymKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/**
 * MONTHLY TOTAL HOURS — the second attendance input mode.
 *
 * The site officer enters ONE total per guard + site + month and classifies
 * it into normal / holiday / sunday hours. Holiday and Sunday hours are
 * multiplied by the OT rate in payroll; normal hours are not.
 *
 * When a monthly sheet exists for a guard it takes precedence over the sum
 * of daily records — the two inputs are never silently mixed.
 */
export class GuardMonthlyHoursService {
  private static assertBucket(bucket: MonthlyHoursBucket) {
    for (const key of ['normalHours', 'holidayHours', 'sundayHours'] as const) {
      const v = bucket[key];
      if (typeof v !== 'number' || !Number.isFinite(v)) {
        throw ApiError.badRequest(`${key} must be a number`);
      }
      if (v < 0) throw ApiError.badRequest(`${key} cannot be negative`);
      if (round2(v) !== v) throw ApiError.badRequest(`${key} supports at most 2 decimal places`);
      if (v > MAX_MONTHLY_HOURS) throw ApiError.badRequest(`${key} cannot exceed ${MAX_MONTHLY_HOURS}h per month`);
    }
    if (bucket.normalHours + bucket.holidayHours + bucket.sundayHours <= 0) {
      throw ApiError.badRequest('Enter hours in at least one section (normal, holiday or Sunday)');
    }
  }

  /** Guard, site and assignment checks shared by every write. */
  private static async assertGuardSite(guardId: string, siteId: string) {
    const guard = await Employee.findById(guardId);
    if (!guard) throw ApiError.notFound('Guard not found in HR');
    if (guard.category !== EmployeeCategory.GUARD) throw ApiError.badRequest('Employee is not a guard');

    const site = await Site.findById(siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const assignment = await PrimarySiteAssignment.findOne({ guardId, siteId });
    if (!assignment) throw ApiError.badRequest('Guard is not assigned to this site');
    if (!assignment.isCurrent) {
      throw ApiError.badRequest('The site assignment has ended — monthly hours can no longer be recorded');
    }

    return { guard, site, assignment };
  }

  /**
   * Upsert the monthly sheet for one guard + site + month.
   * Previous values are kept in changeHistory (never overwritten silently).
   */
  static async saveMonthly(
    params: {
      year: number;
      month: number;
      entries: ({ guardId: string; siteId: string } & MonthlyHoursBucket & { notes?: string })[];
      userId: string;
      source?: string;
    },
    auditCtx?: AuditCtx
  ) {
    if (!Array.isArray(params.entries) || params.entries.length === 0) {
      throw ApiError.badRequest('No entries supplied');
    }
    const periodKey = ymKey(params.year, params.month);

    // Payroll lock: a submitted/approved run freezes the month's attendance.
    await GuardPayrollLockService.assertGuardAttendanceEditable(periodKey, 'save the monthly hours sheet');

    const saved: { guardId: string; siteId: string; doc: IGuardMonthlyHours; created: boolean }[] = [];
    const failed: { guardId: string; siteId?: string; message: string }[] = [];

    for (const entry of params.entries) {
      try {
        if (!entry.guardId || !entry.siteId) throw ApiError.badRequest('guardId and siteId are required');
        this.assertBucket(entry);
        await this.assertGuardSite(entry.guardId, entry.siteId);

        const existing = await GuardMonthlyHours.findOne({
          guardId: entry.guardId,
          siteId: entry.siteId,
          periodKey,
        });

        const next: MonthlyHoursBucket = {
          normalHours: round2(entry.normalHours),
          holidayHours: round2(entry.holidayHours),
          sundayHours: round2(entry.sundayHours),
        };

        if (existing) {
          const previous: MonthlyHoursBucket = {
            normalHours: existing.normalHours,
            holidayHours: existing.holidayHours,
            sundayHours: existing.sundayHours,
          };
          const changed =
            previous.normalHours !== next.normalHours ||
            previous.holidayHours !== next.holidayHours ||
            previous.sundayHours !== next.sundayHours ||
            (entry.notes ?? existing.notes) !== existing.notes;

          if (changed) {
            existing.normalHours = next.normalHours;
            existing.holidayHours = next.holidayHours;
            existing.sundayHours = next.sundayHours;
            if (entry.notes !== undefined) existing.notes = entry.notes;
            existing.updatedBy = params.userId as any;
            existing.changeHistory.push({
              previous,
              new: next,
              changedBy: params.userId as any,
              changedAt: new Date(),
            });
            await existing.save();

            await AuditService.log({
              userId: params.userId,
              action: 'GUARD_MONTHLY_HOURS_UPDATE',
              entity: 'GuardMonthlyHours',
              entityId: (existing._id as any).toString(),
              oldValues: { ...previous, periodKey },
              newValues: { ...next, periodKey },
              ipAddress: auditCtx?.ip,
              userAgent: auditCtx?.ua,
            });
          }
          saved.push({ guardId: entry.guardId, siteId: entry.siteId, doc: existing, created: false });
        } else {
          const doc = await GuardMonthlyHours.create({
            guardId: entry.guardId,
            siteId: entry.siteId,
            periodKey,
            ...next,
            notes: entry.notes,
            source: params.source || 'HR_MANUAL',
            recordedBy: params.userId,
            updatedBy: params.userId,
            changeHistory: [{ previous: { normalHours: 0, holidayHours: 0, sundayHours: 0 }, new: next, changedBy: params.userId, changedAt: new Date() }],
          });
          await AuditService.log({
            userId: params.userId,
            action: 'GUARD_MONTHLY_HOURS_SAVE',
            entity: 'GuardMonthlyHours',
            entityId: (doc._id as any).toString(),
            newValues: { ...next, periodKey, guardId: entry.guardId, siteId: entry.siteId },
            ipAddress: auditCtx?.ip,
            userAgent: auditCtx?.ua,
          });
          saved.push({ guardId: entry.guardId, siteId: entry.siteId, doc, created: true });
        }
      } catch (err: any) {
        failed.push({ guardId: entry.guardId, siteId: entry.siteId, message: err?.message || 'Failed to save' });
      }
    }

    return { saved, failed };
  }

  /** Sum of ACTIVE daily records for the month, grouped by guard+site. */
  private static async dailyTotalsForPeriod(periodKey: string) {
    const records = await GuardAttendanceRecord.find({
      periodKey,
      status: GuardAttendanceStatus.ACTIVE,
    }).populate('siteId', 'siteName siteCode');

    const byGuard = new Map<string, Map<string, { siteName: string; totalHours: number; holidayHours: number; normalHours: number }>>();
    for (const rec of records) {
      const gId = rec.guardId.toString();
      const siteDoc: any = rec.siteId;
      const sId = (siteDoc && siteDoc._id ? siteDoc._id : siteDoc).toString();
      if (!byGuard.has(gId)) byGuard.set(gId, new Map());
      const perSite = byGuard.get(gId)!;
      const bucket = perSite.get(sId) || { siteName: siteDoc?.siteName || 'Site', totalHours: 0, holidayHours: 0, normalHours: 0 };
      bucket.totalHours = round2(bucket.totalHours + rec.hoursWorked);
      if (rec.isHoliday) bucket.holidayHours = round2(bucket.holidayHours + rec.hoursWorked);
      else bucket.normalHours = round2(bucket.normalHours + rec.hoursWorked);
      perSite.set(sId, bucket);
    }
    return byGuard;
  }

  /**
   * The monthly worksheet: for every guard assigned to a site, their saved
   * monthly sheet, the daily-record totals for comparison, and warnings when
   * the two inputs disagree.
   */
  static async getMonthlySheet(year: number, month: number, siteId?: string) {
    const periodKey = ymKey(year, month);

    const assignmentFilter: Record<string, unknown> = { isCurrent: true };
    if (siteId) assignmentFilter.siteId = siteId;
    const assignments = await PrimarySiteAssignment.find(assignmentFilter)
      .populate('siteId', 'siteName siteCode')
      .sort({ isPrimary: -1, effectiveFrom: -1 });

    const guardIds = Array.from(new Set(assignments.map((a) => a.guardId.toString())));
    const [guards, sheets, dailyByGuard] = await Promise.all([
      guardIds.length
        ? Employee.find({ _id: { $in: guardIds } }).sort({ employeeCode: 1 })
        : Promise.resolve([] as any[]),
      GuardMonthlyHours.find({ periodKey }),
      this.dailyTotalsForPeriod(periodKey),
    ]);

    const guardById = new Map(guards.map((g: any) => [g._id.toString(), g]));
    const sheetByGuardSite = new Map<string, IGuardMonthlyHours>();
    for (const sheet of sheets) {
      sheetByGuardSite.set(`${sheet.guardId.toString()}:${sheet.siteId.toString()}`, sheet);
    }

    const rows = assignments
      .map((assignment) => {
        const gId = assignment.guardId.toString();
        // siteId may be a populated document or a bare ObjectId — handle both.
        const sitePop: any = assignment.siteId;
        const sId = (sitePop && sitePop._id ? sitePop._id : sitePop).toString();
        const guard = guardById.get(gId);
        if (!guard) return null;

        const sheet = sheetByGuardSite.get(`${gId}:${sId}`);
        const daily = dailyByGuard.get(gId)?.get(sId) || null;

        const warnings: string[] = [];
        if (sheet && daily) {
          const sheetTotal = round2(sheet.normalHours + sheet.holidayHours + sheet.sundayHours);
          if (Math.abs(sheetTotal - daily.totalHours) > 0.01) {
            warnings.push(
              `Monthly total ${sheetTotal}h differs from daily records ${daily.totalHours}h — the monthly sheet is what payroll will use.`
            );
          }
          if (Math.abs(sheet.holidayHours - daily.holidayHours) > 0.01) {
            warnings.push(`Holiday hours ${sheet.holidayHours}h differ from daily records ${daily.holidayHours}h.`);
          }
        } else if (sheet && !daily && dailyByGuard.has(gId)) {
          warnings.push('Monthly sheet saved but this guard has daily records at another site.');
        } else if (!sheet && daily) {
          warnings.push('Daily records exist but no monthly sheet — payroll will fall back to the daily totals.');
        }

        return {
          assignment: {
            _id: assignment._id,
            role: assignment.role,
            isPrimary: !!assignment.isPrimary,
            effectiveFrom: assignment.effectiveFrom,
          },
          guard: {
            _id: guard._id,
            employeeCode: guard.employeeCode,
            firstName: guard.firstName,
            lastName: guard.lastName,
            status: guard.status,
          },
          site: { _id: sId, siteName: sitePop?.siteName || '', siteCode: sitePop?.siteCode || '' },
          sheet: sheet
            ? {
                _id: (sheet._id as any).toString(),
                normalHours: sheet.normalHours,
                holidayHours: sheet.holidayHours,
                sundayHours: sheet.sundayHours,
                notes: sheet.notes || '',
              }
            : null,
          daily: daily
            ? { totalHours: daily.totalHours, holidayHours: daily.holidayHours, normalHours: daily.normalHours }
            : null,
          warnings,
        };
      })
      .filter(Boolean);

    const savedSheets = sheets.length;

    return {
      periodKey,
      rows,
      stats: {
        assignedRows: rows.length,
        savedSheets,
        guardsWithDaily: dailyByGuard.size,
        totalNormal: round2(sheets.reduce((s, x) => s + x.normalHours, 0)),
        totalHoliday: round2(sheets.reduce((s, x) => s + x.holidayHours, 0)),
        totalSunday: round2(sheets.reduce((s, x) => s + x.sundayHours, 0)),
      },
    };
  }

  /**
   * Canonical hours feed for guard payroll: monthly sheets win; daily sums
   * are the fallback. Holiday and Sunday hours must be priced at the OT rate.
   */
  static async getPayrollHours(year: number, month: number, guardId?: string) {
    const periodKey = ymKey(year, month);

    const sheetFilter: Record<string, unknown> = { periodKey };
    if (guardId) sheetFilter.guardId = guardId;
    const sheets = await GuardMonthlyHours.find(sheetFilter);

    const guardsWithSheets = new Set(sheets.map((s) => s.guardId.toString()));
    // DAILY FALLBACK — Sunday hours are classified from the calendar date
    // ($dayOfWeek 1 = Sunday). GuardAttendanceRecord.date is a "YYYY-MM-DD"
    // string; $toDate parses it as UTC midnight, so the weekday is exact.
    // (Fix: the old fallback reported sundayHours: 0 and underpaid Sunday work.)
    const dailyRows = (await GuardAttendanceRecord.aggregate([
      {
        $match: {
          periodKey,
          status: GuardAttendanceStatus.ACTIVE,
          ...(guardId ? { guardId: new mongoose.Types.ObjectId(guardId) } : {}),
        },
      },
      {
        $group: {
          _id: { guardId: '$guardId', siteId: '$siteId' },
          normalHours: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isHoliday', false] }, { $ne: [{ $dayOfWeek: { $toDate: '$date' } }, 1] }] },
                '$hoursWorked',
                0,
              ],
            },
          },
          holidayHours: { $sum: { $cond: [{ $eq: ['$isHoliday', true] }, '$hoursWorked', 0] } },
          sundayHours: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$isHoliday', false] }, { $eq: [{ $dayOfWeek: { $toDate: '$date' } }, 1] }] },
                '$hoursWorked',
                0,
              ],
            },
          },
        },
      },
    ])).filter((r) => !guardsWithSheets.has(r._id.guardId.toString()));

    const siteDocs = await Site.find({ _id: { $in: sheets.map((s) => s.siteId) } }).select('siteName siteCode');
    const siteById = new Map(siteDocs.map((s) => [s._id.toString(), s]));

    const byGuard = new Map<string, {
      guardId: string;
      sites: { siteId: string; siteName?: string; normalHours: number; holidayHours: number; sundayHours: number; source: 'MONTHLY' | 'DAILY' }[];
      totals: { normalHours: number; holidayHours: number; sundayHours: number };
      source: 'MONTHLY' | 'DAILY';
    }>();

    const pushSite = (
      gId: string,
      site: { siteId: string; siteName?: string; normalHours: number; holidayHours: number; sundayHours: number; source: 'MONTHLY' | 'DAILY' }
    ) => {
      if (!byGuard.has(gId)) {
        byGuard.set(gId, {
          guardId: gId,
          sites: [],
          totals: { normalHours: 0, holidayHours: 0, sundayHours: 0 },
          source: site.source,
        });
      }
      const entry = byGuard.get(gId)!;
      entry.sites.push(site);
      entry.totals.normalHours = round2(entry.totals.normalHours + site.normalHours);
      entry.totals.holidayHours = round2(entry.totals.holidayHours + site.holidayHours);
      entry.totals.sundayHours = round2(entry.totals.sundayHours + site.sundayHours);
      if (site.source === 'MONTHLY') entry.source = 'MONTHLY';
    };

    for (const sheet of sheets) {
      const sId = sheet.siteId.toString();
      const siteDoc: any = siteById.get(sId);
      pushSite(sheet.guardId.toString(), {
        siteId: sId,
        siteName: siteDoc?.siteName,
        normalHours: sheet.normalHours,
        holidayHours: sheet.holidayHours,
        sundayHours: sheet.sundayHours,
        source: 'MONTHLY',
      });
    }

    for (const row of dailyRows) {
      pushSite(row._id.guardId.toString(), {
        siteId: row._id.siteId.toString(),
        normalHours: round2(row.normalHours),
        holidayHours: round2(row.holidayHours),
        sundayHours: round2(row.sundayHours || 0),
        source: 'DAILY',
      });
    }

    return {
      periodKey,
      guards: Array.from(byGuard.values()),
    };
  }
}
