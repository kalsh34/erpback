import { GuardAttendanceRecord, IGuardAttendanceRecord } from '../../../models/GuardAttendanceRecord';
import { PrimarySiteAssignment } from '../../../models/PrimarySiteAssignment';
import { Employee } from '../../../models/Employee';
import { Site } from '../../../models/Site';
import { ApiError } from '../../../common/ApiError';
import { config } from '../../../config/env';
import { AuditService } from '../../../core/audit/AuditService';
import { eventBus } from '../../../core/events/EventBus';
import { GuardPayrollLockService } from '../../guardPayroll/guardPayrollLock.service';
import {
  EmployeeCategory, EmployeeStatus, AttendanceSource, GuardAttendanceStatus,
} from '../../../types';
import { parseYmdLocal, ymdLocal } from '../../../common/dateUtils';

/** Statuses that count as an employed guard for attendance purposes. */
const ATTENDABLE_STATUSES: EmployeeStatus[] = [EmployeeStatus.ACTIVE, EmployeeStatus.CONTRACTED];

interface AuditCtx { userId: string; ip?: string; ua?: string }

export interface AttendanceEntryInput {
  guardId: string;
  hoursWorked: number;
  isHoliday?: boolean;
  notes?: string;
}

const periodKeyOfDate = (dateStr: string) => dateStr.slice(0, 7); // "YYYY-MM" from "YYYY-MM-DD"

export class GuardAttendanceService {
  /** Hard cap (rejects) vs expected-hours warning (never rejects). */
  static getConfig() {
    return {
      maxDailyHours: config.attendanceMaxDailyHours,
      expectedDailyHours: config.attendanceExpectedDailyHours,
    };
  }

  // ───────────────────────────────────────────────────────────────────
  // Validation (hard rules — enforced on every write)
  // ───────────────────────────────────────────────────────────────────

  private static parseDate(date: string): Date {
    const d = parseYmdLocal(date);
    if (!d) throw ApiError.badRequest('Invalid date — expected YYYY-MM-DD');
    return d;
  }

  private static startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  private static assertHours(hours: number): number {
    const { maxDailyHours } = this.getConfig();
    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
      throw ApiError.badRequest('Hours worked must be a number');
    }
    if (hours <= 0) {
      throw ApiError.badRequest('Hours must be greater than 0 — to clear an entry, void it instead');
    }
    if (Math.round(hours * 100) / 100 !== hours) {
      throw ApiError.badRequest('Hours support at most 2 decimal places (e.g. 8 or 8.5)');
    }
    if (hours > maxDailyHours) {
      throw ApiError.badRequest(`Hours cannot exceed ${maxDailyHours} per day`);
    }
    return hours;
  }

  private static async assertGuardAndAssignment(guardId: string, siteId: string, dateStr: string) {
    const date = this.parseDate(dateStr);

    const guard = await Employee.findById(guardId);
    if (!guard) throw ApiError.notFound('Guard not found in HR');
    if (guard.category !== EmployeeCategory.GUARD) throw ApiError.badRequest('Employee is not a guard');
    if (!ATTENDABLE_STATUSES.includes(guard.status)) {
      throw ApiError.badRequest(`Guard status is ${guard.status} — attendance can only be recorded for active guards`);
    }

    const site = await Site.findById(siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const assignment = await PrimarySiteAssignment.findOne({ guardId, siteId });
    if (!assignment) {
      throw ApiError.badRequest('Guard is not assigned to this site');
    }
    if (!assignment.isCurrent) {
      throw ApiError.badRequest('The site assignment has ended — attendance after the end date is rejected');
    }
    if (this.startOfDay(date) < this.startOfDay(assignment.effectiveFrom)) {
      throw ApiError.badRequest(`Assignment starts on ${ymdLocal(assignment.effectiveFrom)} — attendance before that date is rejected`);
    }
    if (assignment.effectiveTo && this.startOfDay(date) > this.startOfDay(assignment.effectiveTo)) {
      throw ApiError.badRequest(`Assignment ended on ${ymdLocal(assignment.effectiveTo)} — attendance after that date is rejected`);
    }

    return { guard, site, assignment };
  }

  /** A guard can never exceed the daily cap across ALL sites combined. */
  private static async assertDayTotal(guardId: string, dateStr: string, addHours: number, excludeRecordId?: string) {
    const { maxDailyHours } = this.getConfig();
    const query: Record<string, unknown> = {
      guardId,
      date: dateStr,
      status: GuardAttendanceStatus.ACTIVE,
    };
    if (excludeRecordId) query._id = { $ne: excludeRecordId };
    const others = await GuardAttendanceRecord.find(query).populate('siteId', 'siteName siteCode');
    const otherTotal = others.reduce((s, r) => s + r.hoursWorked, 0);
    const combined = Math.round((otherTotal + addHours) * 100) / 100;
    if (combined > maxDailyHours) {
      const detail = others
        .map((r) => `${(r.siteId as any)?.siteName || 'site'} = ${r.hoursWorked}h`)
        .join(', ');
      throw ApiError.badRequest(
        `Daily total for ${dateStr} would be ${combined}h across sites (${detail || 'existing entries'}, + ${addHours}h) — the limit is ${maxDailyHours}h per day`
      );
    }
    return others;
  }

  private static assertFuture(dateStr: string, allowFuture: boolean) {
    if (allowFuture) return;
    const date = this.parseDate(dateStr);
    const today = this.startOfDay(new Date());
    if (date.getTime() > today.getTime()) {
      throw ApiError.badRequest('Attendance for future dates is not allowed');
    }
  }

  // ───────────────────────────────────────────────────────────────────
  // Writes
  // ───────────────────────────────────────────────────────────────────

  /**
   * Create or update ONE guard's hours at ONE site on ONE day.
   * Updates keep the previous hours in changeHistory (never overwritten silently).
   */
  static async saveEntry(
    params: { siteId: string; date: string; entry: AttendanceEntryInput; userId: string; allowFuture?: boolean; source?: AttendanceSource },
    auditCtx?: { ip?: string; ua?: string }
  ): Promise<{ record: IGuardAttendanceRecord; created: boolean }> {
    const { siteId, date, entry, userId } = params;
    this.assertFuture(date, !!params.allowFuture);
    const hours = this.assertHours(entry.hoursWorked);
    await this.assertGuardAndAssignment(entry.guardId, siteId, date);
    const periodKey = periodKeyOfDate(date);

    // Payroll lock: a submitted/approved guard payroll run freezes the month.
    await GuardPayrollLockService.assertGuardAttendanceEditable(periodKey, 'save guard attendance');

    const existing = await GuardAttendanceRecord.findOne({
      guardId: entry.guardId,
      siteId,
      date,
      status: GuardAttendanceStatus.ACTIVE,
    });

    if (existing) {
      const previousHours = existing.hoursWorked;
      if (previousHours !== hours || existing.isHoliday !== !!entry.isHoliday || (entry.notes ?? existing.notes) !== existing.notes) {
        await this.assertDayTotal(entry.guardId, date, hours, existing._id as any);
        existing.hoursWorked = hours;
        existing.isHoliday = !!entry.isHoliday;
        existing.periodKey = periodKey;
        if (entry.notes !== undefined) existing.notes = entry.notes;
        existing.updatedBy = userId as any;
        existing.changeHistory.push({
          previousHours,
          newHours: hours,
          changedBy: userId as any,
          changedAt: new Date(),
        });
        await existing.save();

        await AuditService.log({
          userId,
          action: 'GUARD_ATTENDANCE_UPDATE',
          entity: 'GuardAttendanceRecord',
          entityId: (existing._id as any).toString(),
          oldValues: { hoursWorked: previousHours, isHoliday: !!(entry.isHoliday ?? existing.isHoliday) },
          newValues: { hoursWorked: hours, isHoliday: !!entry.isHoliday, date, siteId },
          ipAddress: auditCtx?.ip,
          userAgent: auditCtx?.ua,
        });
        eventBus.emit('hr.guardAttendance.updated', { guardId: entry.guardId, siteId, date, hours });
      }
      return { record: existing, created: false };
    }

    await this.assertDayTotal(entry.guardId, date, hours);

    const record = await GuardAttendanceRecord.create({
      guardId: entry.guardId,
      siteId,
      date,
      dayOfMonth: this.parseDate(date).getDate(),
      hoursWorked: hours,
      isHoliday: !!entry.isHoliday,
      periodKey,
      status: GuardAttendanceStatus.ACTIVE,
      source: params.source || AttendanceSource.OPERATIONS_EDIT,
      notes: entry.notes,
      recordedBy: userId,
      updatedBy: userId,
    });

    await AuditService.log({
      userId,
      action: 'GUARD_ATTENDANCE_CREATE',
      entity: 'GuardAttendanceRecord',
      entityId: (record._id as any).toString(),
      newValues: { guardId: entry.guardId, siteId, date, hoursWorked: hours, isHoliday: !!entry.isHoliday },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardAttendance.created', { guardId: entry.guardId, siteId, date, hours });

    return { record, created: true };
  }

  /**
   * Fast daily entry: save a whole site-day in one call. Individual failures are
   * reported per guard so one bad row never discards the rest of the sheet.
   */
  static async saveDay(
    params: { siteId: string; date: string; entries: AttendanceEntryInput[]; userId: string; allowFuture?: boolean; source?: AttendanceSource },
    auditCtx?: { ip?: string; ua?: string }
  ) {
    if (!Array.isArray(params.entries) || params.entries.length === 0) {
      throw ApiError.badRequest('No entries supplied');
    }
    this.assertFuture(params.date, !!params.allowFuture);

    const saved: { guardId: string; record: IGuardAttendanceRecord }[] = [];
    const failed: { guardId: string; message: string }[] = [];

    for (const entry of params.entries) {
      try {
        const { record } = await this.saveEntry(
          {
            siteId: params.siteId,
            date: params.date,
            entry,
            userId: params.userId,
            allowFuture: params.allowFuture,
            source: params.source,
          },
          auditCtx
        );
        saved.push({ guardId: entry.guardId, record });
      } catch (err: any) {
        failed.push({ guardId: entry.guardId, message: err?.message || 'Failed to save' });
      }
    }

    await AuditService.log({
      userId: params.userId,
      action: 'GUARD_ATTENDANCE_DAY_SAVE',
      entity: 'GuardAttendanceRecord',
      newValues: { siteId: params.siteId, date: params.date, saved: saved.length, failed: failed.length },
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });

    return { saved, failed };
  }

  /** Controlled correction: void (never hard-delete) with a reason and who did it. */
  static async voidRecord(recordId: string, reason: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const record = await GuardAttendanceRecord.findById(recordId);
    if (!record) throw ApiError.notFound('Attendance record not found');
    if (record.status === GuardAttendanceStatus.VOID) throw ApiError.badRequest('Record is already voided');
    if (!reason || !reason.trim()) throw ApiError.badRequest('A reason is required to void an attendance record');

    // Payroll lock: corrections to a locked month need a RETURN of the payroll first.
    await GuardPayrollLockService.assertGuardAttendanceEditable(record.periodKey, 'void this attendance record');

    const dateStr = record.date;
    const previousHours = record.hoursWorked;
    record.status = GuardAttendanceStatus.VOID;
    record.voidedBy = userId as any;
    record.voidedAt = new Date();
    record.voidReason = reason.trim();
    record.updatedBy = userId as any;
    await record.save();

    await AuditService.log({
      userId,
      action: 'GUARD_ATTENDANCE_VOID',
      entity: 'GuardAttendanceRecord',
      entityId: recordId,
      oldValues: { status: GuardAttendanceStatus.ACTIVE, hoursWorked: previousHours },
      newValues: { status: GuardAttendanceStatus.VOID, reason: reason.trim() },
      reason: reason.trim(),
      ipAddress: auditCtx?.ip,
      userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.guardAttendance.voided', { recordId, guardId: record.guardId, siteId: record.siteId, date: dateStr });

    return record;
  }

  // ───────────────────────────────────────────────────────────────────
  // Reads
  // ───────────────────────────────────────────────────────────────────

  /** Guards assigned to a site + their hours already recorded for that day. */
  static async getDayRoster(siteId: string, date: string, opts?: { allowFuture?: boolean }) {
    this.parseDate(date);
    const site = await Site.findById(siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const periodKey = periodKeyOfDate(date);
    const assignments = await PrimarySiteAssignment.find({ siteId, isCurrent: true }).sort({ isPrimary: -1, effectiveFrom: -1 });
    const guardIds = assignments.map((a) => a.guardId);
    const [guards, dayRecords] = await Promise.all([
      guardIds.length
        ? Employee.find({ _id: { $in: guardIds } }).sort({ employeeCode: 1 })
        : Promise.resolve([]),
      GuardAttendanceRecord.find({ date, status: GuardAttendanceStatus.ACTIVE }),
    ]);

    const guardById = new Map(guards.map((g) => [g._id.toString(), g]));
    const recordByGuard = new Map<string, IGuardAttendanceRecord>();
    const otherSiteHoursByGuard = new Map<string, { total: number; detail: { siteName: string; hours: number }[] }>();

    const siteDocs = await Site.find({ _id: { $in: dayRecords.map((r) => r.siteId) } }).select('siteName');
    const siteNameById = new Map(siteDocs.map((s) => [s._id.toString(), s.siteName]));

    for (const rec of dayRecords) {
      const gId = rec.guardId.toString();
      if (rec.siteId.toString() === siteId) {
        recordByGuard.set(gId, rec);
      } else {
        const entry = otherSiteHoursByGuard.get(gId) || { total: 0, detail: [] };
        entry.total = Math.round((entry.total + rec.hoursWorked) * 100) / 100;
        entry.detail.push({ siteName: siteNameById.get(rec.siteId.toString()) || 'Site', hours: rec.hoursWorked });
        otherSiteHoursByGuard.set(gId, entry);
      }
    }

    const today = this.startOfDay(new Date());
    const rows = assignments.map((assignment) => {
      const guard = guardById.get(assignment.guardId.toString());
      if (!guard) return null;
      const record = recordByGuard.get(guard._id.toString()) || null;
      const others = otherSiteHoursByGuard.get(guard._id.toString()) || { total: 0, detail: [] };
      const assignmentOk = this.parseDate(date).getTime() >= this.startOfDay(assignment.effectiveFrom).getTime();
      return {
        guard: {
          _id: guard._id,
          employeeCode: guard.employeeCode,
          firstName: guard.firstName,
          lastName: guard.lastName,
          status: guard.status,
        },
        assignment: {
          _id: assignment._id,
          role: assignment.role,
          isPrimary: !!assignment.isPrimary,
          effectiveFrom: assignment.effectiveFrom,
          rate: assignment.hourlyRate,
        },
        attendable: ATTENDABLE_STATUSES.includes(guard.status) && assignmentOk,
        record,
        otherSiteHours: others.total,
        otherSiteDetail: others.detail,
      };
    }).filter(Boolean);

    return {
      site: { _id: site._id, siteName: site.siteName, siteCode: site.siteCode },
      date,
      periodKey,
      config: this.getConfig(),
      futureDate: this.parseDate(date).getTime() > today.getTime(),
      editable: true,
      rows,
    };
  }

  /**
   * Monthly totals: SUM(valid daily hours) grouped by GUARD + SITE + calendar
   * month. Sites are never merged; the primary site is flagged per guard.
   */
  static async getMonthlyTotals(year: number, month: number, siteId?: string) {
    const periodKey = `${year}-${String(month).padStart(2, '0')}`;
    const match: Record<string, unknown> = { periodKey, status: GuardAttendanceStatus.ACTIVE };
    if (siteId) match.siteId = siteId;

    const [records, siteDocs] = await Promise.all([
      GuardAttendanceRecord.find(match).populate('siteId', 'siteName siteCode'),
      Site.find().select('siteName siteCode'),
    ]);
    const siteNameById = new Map(siteDocs.map((s) => [s._id.toString(), s]));

    const guardIds = Array.from(new Set(records.map((r) => r.guardId.toString())));
    const assignments = guardIds.length
      ? await PrimarySiteAssignment.find({ guardId: { $in: guardIds }, isCurrent: true })
      : [];

    const primaryByGuard = new Map<string, string>();
    for (const a of assignments) {
      if (a.isPrimary) primaryByGuard.set(a.guardId.toString(), a.siteId.toString());
    }
    const guards = guardIds.length
      ? await Employee.find({ _id: { $in: guardIds } }).sort({ employeeCode: 1 })
      : [];
    const guardById = new Map(guards.map((g) => [g._id.toString(), g]));

    const byGuard = new Map<string, Map<string, { totalHours: number; holidayHours: number; dayCount: number }>>();
    for (const rec of records) {
      const gId = rec.guardId.toString();
      // siteId is populated here — key by its _id, not the document string.
      const siteDoc: any = rec.siteId;
      const sId = (siteDoc && siteDoc._id ? siteDoc._id : siteDoc).toString();
      if (!byGuard.has(gId)) byGuard.set(gId, new Map());
      const perSite = byGuard.get(gId)!;
      const bucket = perSite.get(sId) || { totalHours: 0, holidayHours: 0, dayCount: 0 };
      bucket.totalHours = Math.round((bucket.totalHours + rec.hoursWorked) * 100) / 100;
      if (rec.isHoliday) bucket.holidayHours = Math.round((bucket.holidayHours + rec.hoursWorked) * 100) / 100;
      bucket.dayCount += 1;
      perSite.set(sId, bucket);
    }

    const rows: any[] = [];
    byGuard.forEach((perSite, gId) => {
      const guard = guardById.get(gId);
      if (!guard) return;
      const primarySiteId = primaryByGuard.get(gId) || null;
      const sites: any[] = [];
      let totalHours = 0;
      perSite.forEach((bucket, sId) => {
        const siteDoc = siteNameById.get(sId);
        totalHours = Math.round((totalHours + bucket.totalHours) * 100) / 100;
        sites.push({
          siteId: sId,
          siteName: siteDoc?.siteName || 'Deleted site',
          siteCode: siteDoc?.siteCode || '',
          isPrimary: primarySiteId === sId,
          ...bucket,
        });
      });
      sites.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.siteName.localeCompare(b.siteName));
      rows.push({
        guard: { _id: guard._id, employeeCode: guard.employeeCode, firstName: guard.firstName, lastName: guard.lastName, status: guard.status },
        primarySiteId,
        sites,
        totalHours,
      });
    });
    rows.sort((a, b) => a.guard.employeeCode.localeCompare(b.guard.employeeCode));

    // Guards with assignments but no attendance this month — payroll gaps.
    const assignedGuardIds = await PrimarySiteAssignment.distinct('guardId', { isCurrent: true });
    const missing = (assignedGuardIds as any[])
      .map((id) => id.toString())
      .filter((id) => !byGuard.has(id));
    const missingGuards = missing.length
      ? await Employee.find({ _id: { $in: missing }, category: EmployeeCategory.GUARD, status: { $in: ATTENDABLE_STATUSES } }).sort({ employeeCode: 1 })
      : [];

    return {
      periodKey,
      config: this.getConfig(),
      rows,
      missingAttendance: missingGuards.map((g) => ({ _id: g._id, employeeCode: g.employeeCode, firstName: g.firstName, lastName: g.lastName })),
      grandTotal: Math.round(rows.reduce((s, r) => s + r.totalHours, 0) * 100) / 100,
    };
  }

  /**
   * Guard → Site → Period → Total Hours feed consumed by payroll.
   * Only ACTIVE (validated, non-void) records inside the period range count.
   */
  static async getSiteHoursForPeriod(periodStart: Date, periodEnd: Date, guardId?: any) {
    const match: Record<string, unknown> = {
      status: GuardAttendanceStatus.ACTIVE,
      date: { $gte: ymdLocal(periodStart), $lte: ymdLocal(periodEnd) },
    };
    if (guardId) match.guardId = guardId;

    const rows = await GuardAttendanceRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: { guardId: '$guardId', siteId: '$siteId' },
          normalHours: { $sum: { $cond: [{ $eq: ['$isHoliday', false] }, '$hoursWorked', 0] } },
          holidayHours: { $sum: { $cond: [{ $eq: ['$isHoliday', true] }, '$hoursWorked', 0] } },
          dayCount: { $sum: 1 },
        },
      },
    ]);

    return rows.map((r) => ({
      guardId: String(r._id.guardId),
      siteId: String(r._id.siteId),
      normalHours: Math.round(r.normalHours * 100) / 100,
      holidayHours: Math.round(r.holidayHours * 100) / 100,
      dayCount: r.dayCount,
    }));
  }

  /** Pre-payroll checks: missing attendance and assignment gaps. */
  static async getPayrollReadiness(year: number, month: number) {
    const totals = await this.getMonthlyTotals(year, month);
    const issues: { guard: any; type: string; message: string }[] = [];

    for (const row of totals.rows) {
      const guardAssignments = await PrimarySiteAssignment.find({ guardId: row.guard._id, isCurrent: true });
      if (guardAssignments.length === 0) {
        issues.push({ guard: row.guard, type: 'NO_ASSIGNMENT', message: 'No active site assignment' });
        continue;
      }
      for (const siteRow of row.sites) {
        if (siteRow.dayCount === 0) {
          issues.push({ guard: row.guard, type: 'ZERO_DAYS', message: `${siteRow.siteName}: no daily records` });
        }
      }
    }

    for (const gap of totals.missingAttendance) {
      issues.push({ guard: gap, type: 'MISSING_ATTENDANCE', message: 'Assigned to a site but no attendance recorded for this period' });
    }

    return {
      periodKey: totals.periodKey,
      config: totals.config,
      guardsWithAttendance: totals.rows.length,
      missingAttendance: totals.missingAttendance,
      issues,
      ready: issues.length === 0,
    };
  }

  /** Raw records for a date range (audit/history view). */
  static async listRecords(filters: { siteId?: string; guardId?: string; from: string; to: string; limit?: number }) {
    const from = this.parseDate(filters.from);
    const to = this.parseDate(filters.to);
    if (to.getTime() < from.getTime()) throw ApiError.badRequest('End date is before start date');

    const query: Record<string, unknown> = { date: { $gte: ymdLocal(from), $lte: ymdLocal(to) } };
    if (filters.siteId) query.siteId = filters.siteId;
    if (filters.guardId) query.guardId = filters.guardId;

    return GuardAttendanceRecord.find(query)
      .populate('siteId', 'siteName siteCode')
      .populate('guardId', 'employeeCode firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .limit(Math.min(filters.limit || 200, 500));
  }
}
