import mongoose from 'mongoose';
import { ShiftSchedule, IShiftSchedule } from '../../../models/ShiftSchedule';
import { ScheduleAssignment } from '../../../models/ScheduleAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { Site } from '../../../models/Site';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { eventBus } from '../../../core/events/EventBus';
import { AuditService } from '../../../core/audit/AuditService';
import {
  buildSchedule,
  slotWindow,
  parseHM,
  atTime,
  AlgorithmConfig,
  AlgorithmAssignment,
  ExternalDuty,
  ShiftMode,
  ShiftType,
} from './shiftSchedule.algorithm';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 366;
const HOUR_MS = 3600000;
const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  return new Date(startOfDay(d).getTime() + n * DAY_MS);
}

function daysInclusive(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((b - a) / DAY_MS) + 1;
}

function validateTime(value: string | undefined, field: string, fallback: string): string {
  const v = (value || '').trim() || fallback;
  if (!TIME_RE.test(v)) throw ApiError.badRequest(`${field} must be in HH:mm 24h format (e.g. 06:00)`);
  return v;
}

function sortPool(pool: any[]): any[] {
  return [...pool].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export interface RosterCell {
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  guardId: string;
  guardName: string;
  employeeCode: string;
  isOverride: boolean;
  source: 'POOL' | 'FLOATER';
}

export class ShiftScheduleService {
  // ── CRUD ────────────────────────────────────────────────────────────────

  static async getAll(query: { status?: string; search?: string; siteId?: string }) {
    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.siteId) filter.siteId = query.siteId;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return ShiftSchedule.find(filter)
      .populate('siteId', 'siteName siteCode location')
      .populate('guardPool.guardId', 'firstName lastName employeeCode')
      .populate('floaterPool.guardId', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })
      .limit(200);
  }

  static async getById(id: string) {
    const plan = await ShiftSchedule.findById(id)
      .populate('siteId', 'siteName siteCode location agreedManpower')
      .populate('guardPool.guardId', 'firstName lastName employeeCode status')
      .populate('floaterPool.guardId', 'firstName lastName employeeCode status')
      .populate('createdBy', 'firstName lastName');
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const generated = await ScheduleAssignment.countDocuments({ planId: id });
    return { ...plan.toObject(), generatedCount: generated };
  }
  static normalizePayload(data: any, fallbackTimes?: { dayStartTime: string; dayEndTime: string; nightStartTime: string; nightEndTime: string }) {
    const shiftMode: ShiftMode = data.shiftMode === 'SINGLE_24H' ? 'SINGLE_24H' : 'STANDARD_12H';
    const dayCount = Math.max(0, parseInt(data.dayCount, 10) || 0);
    let nightCount = Math.max(0, parseInt(data.nightCount, 10) || 0);

    if (shiftMode === 'SINGLE_24H') {
      if (dayCount < 1) throw ApiError.badRequest('24h scheduling needs at least 1 guard on duty');
      nightCount = 0;
    } else if (dayCount + nightCount < 1) {
      throw ApiError.badRequest('At least one guard must be scheduled per day (day or night)');
    }

    const dayStartTime = validateTime(data.dayStartTime, 'Day start time', fallbackTimes?.dayStartTime || '06:00');
    const dayEndTime = validateTime(data.dayEndTime, 'Day end time', fallbackTimes?.dayEndTime || '18:00');
    const nightStartTime = validateTime(data.nightStartTime, 'Night start time', fallbackTimes?.nightStartTime || '18:00');
    const nightEndTime = validateTime(data.nightEndTime, 'Night end time', fallbackTimes?.nightEndTime || '06:00');

    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) throw ApiError.badRequest('Valid start date is required');
    if (!endDate || Number.isNaN(endDate.getTime())) throw ApiError.badRequest('Valid end date is required');
    if (startOfDay(endDate).getTime() < startOfDay(startDate).getTime()) {
      throw ApiError.badRequest('End date must be on or after the start date');
    }
    if (daysInclusive(startDate, endDate) > MAX_RANGE_DAYS) {
      throw ApiError.badRequest(`Schedule range cannot exceed ${MAX_RANGE_DAYS} days`);
    }

    return {
      name: (data.name || '').trim(),
      description: (data.description || '').trim() || undefined,
      siteId: data.siteId,
      shiftMode,
      dayCount,
      nightCount,
      dayStartTime,
      dayEndTime,
      nightStartTime,
      nightEndTime,
      startDate: startOfDay(startDate),
      endDate: startOfDay(endDate),
    };
  }

  static async create(data: any, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    if (!data.siteId) throw ApiError.badRequest('Site is required');
    const site = await Site.findById(data.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const normalized = this.normalizePayload(data);
    if (!normalized.name) normalized.name = `${site.siteName} Schedule`;
    const plan = await ShiftSchedule.create({ ...normalized, guardPool: [], floaterPool: [], status: 'DRAFT', createdBy: userId });

    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_CREATE', entity: 'ShiftSchedule', entityId: (plan._id as any).toString(),
      newValues: { name: plan.name, siteId: plan.siteId, shiftMode: plan.shiftMode, startDate: plan.startDate, endDate: plan.endDate },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.shiftSchedule.created', { planId: (plan._id as any).toString() });
    return plan;
  }

  static async update(id: string, data: any, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');

    const normalized = this.normalizePayload(
      { ...data, siteId: data.siteId || plan.siteId },
      { dayStartTime: plan.dayStartTime, dayEndTime: plan.dayEndTime, nightStartTime: plan.nightStartTime, nightEndTime: plan.nightEndTime }
    );
    if (!normalized.name) normalized.name = plan.name;
    const site = await Site.findById(normalized.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    Object.assign(plan, normalized);
    await plan.save();

    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_UPDATE', entity: 'ShiftSchedule', entityId: id,
      newValues: { name: plan.name, shiftMode: plan.shiftMode, startDate: plan.startDate, endDate: plan.endDate },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    return plan;
  }

  static async delete(id: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    await ScheduleAssignment.deleteMany({ planId: id });
    await plan.deleteOne();
    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_DELETE', entity: 'ShiftSchedule', entityId: id,
      oldValues: { name: plan.name },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.shiftSchedule.deleted', { planId: id });
  }

  // ── Pool management ─────────────────────────────────────────────────────

  static async addGuards(id: string, guardIds: string[], userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const existing = new Set((plan.guardPool as any[]).map((g) => g.guardId.toString()));
    let order = (plan.guardPool as any[]).length;
    for (const gid of guardIds) {
      if (existing.has(gid)) continue;
      const emp = await Employee.findById(gid);
      if (!emp) throw ApiError.notFound(`Guard ${gid} not found`);
      (plan.guardPool as any[]).push({ guardId: new mongoose.Types.ObjectId(gid), status: 'ACTIVE', order });
      order += 1;
      existing.add(gid);
    }
    await plan.save();
    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_ADD_GUARDS', entity: 'ShiftSchedule', entityId: id,
      newValues: { guardIds }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    return plan;
  }
  static async removeGuard(id: string, guardId: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    plan.guardPool = (plan.guardPool as any[]).filter((g) => g.guardId.toString() !== guardId) as any;
    plan.guardPool.forEach((g: any, i: number) => { g.order = i; });
    await plan.save();
    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_REMOVE_GUARD', entity: 'ShiftSchedule', entityId: id,
      oldValues: { guardId }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    return plan;
  }

  static async reorderPool(id: string, orderedGuardIds: string[], userId: string) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const byId = new Map<string, any>();
    (plan.guardPool as any[]).forEach((g) => byId.set(g.guardId.toString(), g));
    const reordered: any[] = [];
    for (const gid of orderedGuardIds) {
      const g = byId.get(gid);
      if (g) { g.order = reordered.length; reordered.push(g); byId.delete(gid); }
    }
    for (const [, g] of byId) { g.order = reordered.length; reordered.push(g); }
    plan.guardPool = reordered as any;
    await plan.save();
    return plan;
  }

  static async addFloaters(id: string, guardIds: string[], userId: string) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const existing = new Set((plan.floaterPool as any[]).map((g) => g.guardId.toString()));
    for (const gid of guardIds) {
      if (existing.has(gid)) continue;
      const emp = await Employee.findById(gid);
      if (!emp) throw ApiError.notFound(`Guard ${gid} not found`);
      (plan.floaterPool as any[]).push({ guardId: new mongoose.Types.ObjectId(gid), status: 'ACTIVE', order: (plan.floaterPool as any[]).length });
    }
    await plan.save();
    return plan;
  }

  static async removeFloater(id: string, guardId: string, userId: string) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    plan.floaterPool = (plan.floaterPool as any[]).filter((g) => g.guardId.toString() !== guardId) as any;
    await plan.save();
    return plan;
  }

  // ── Scheduling engine ───────────────────────────────────────────────────

  /**
   * Every duty the pooled guards already have OUTSIDE this plan, inside a
   * window slightly wider than the scheduling range (rest needs up to 48h of
   * look-behind/look-ahead). Sources:
   *  - ScheduleAssignment documents from OTHER plans (cross-site awareness)
   *  - ShiftAssignment manual/recurring shift templates (expanded per day)
   */
  static async loadExternalDuties(planId: string, guardIds: string[], rangeStart: Date, rangeEnd: Date): Promise<ExternalDuty[]> {
    const duties: ExternalDuty[] = [];
    if (guardIds.length === 0) return duties;

    const lookBehind = new Date(startOfDay(rangeStart).getTime() - 2 * DAY_MS);
    const lookAhead = new Date(startOfDay(rangeEnd).getTime() + 3 * DAY_MS);
    const oidList = guardIds.map((g) => new mongoose.Types.ObjectId(g));

    const otherPlanDuties = await ScheduleAssignment.find({
      guardId: { $in: oidList },
      planId: { $ne: new mongoose.Types.ObjectId(planId) },
      startAt: { $lt: lookAhead },
      endAt: { $gt: lookBehind },
    }).populate('siteId', 'siteName');

    for (const d of otherPlanDuties) {
      const site = d.siteId as any;
      duties.push({
        guardId: d.guardId.toString(),
        start: new Date(d.startAt.getTime()),
        end: new Date(d.endAt.getTime()),
        source: site?.siteName ? `schedule at ${site.siteName}` : 'another schedule',
      });
    }

    const manualAssignments = await ShiftAssignment.find({
      guardId: { $in: oidList },
      status: 'ACTIVE',
      startDate: { $lte: lookAhead },
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: new Date(0) }, { endDate: { $gte: lookBehind } }],
    }).populate('siteId', 'siteName').populate('shiftTemplateId', 'name startTime endTime');

    for (const a of manualAssignments) {
      const template = a.shiftTemplateId as any;
      if (!template?.startTime || !template?.endTime) continue;
      const site = a.siteId as any;
      const effStart = a.startDate && a.startDate.getTime() > lookBehind.getTime() ? a.startDate : lookBehind;
      const effEnd = a.endDate && a.endDate.getTime() > 0 && a.endDate.getTime() < lookAhead.getTime() ? a.endDate : lookAhead;
      let cursor = startOfDay(effStart);
      const lastDay = startOfDay(effEnd);
      while (cursor.getTime() <= lastDay.getTime() && duties.length < 2000) {
        const s = parseHM(template.startTime, '06:00');
        const e = parseHM(template.endTime, '18:00');
        const start = atTime(cursor, s.h, s.m);
        let end = atTime(cursor, e.h, e.m);
        if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + DAY_MS);
        duties.push({
          guardId: (a.guardId as any).toString(),
          start, end,
          source: site?.siteName ? `shift "${template.name}" at ${site.siteName}` : `shift "${template.name}"`,
        });
        cursor = addDays(cursor, 1);
      }
    }

    return duties;
  }
  private static buildAlgorithmConfig(plan: IShiftSchedule, rangeStart: Date, days: number, external: ExternalDuty[]): AlgorithmConfig {
    const pool = sortPool((plan.guardPool as any[]).filter((g) => g.status === 'ACTIVE'))
      .map((g, i) => ({ id: g.guardId.toString(), order: g.order ?? i }));
    const floaters = sortPool((plan.floaterPool as any[]).filter((g) => g.status === 'ACTIVE'))
      .map((g, i) => ({ id: g.guardId.toString(), order: g.order ?? i }));
    return {
      shiftMode: plan.shiftMode as ShiftMode,
      dayCount: plan.dayCount,
      nightCount: plan.nightCount,
      dayStartTime: plan.dayStartTime,
      dayEndTime: plan.dayEndTime,
      nightStartTime: plan.nightStartTime,
      nightEndTime: plan.nightEndTime,
      pool,
      floaters,
      external,
      from: startOfDay(rangeStart),
      days,
    };
  }

  /** Solve one scheduling window. Does not touch the database. */
  static async solve(plan: IShiftSchedule, rangeStart: Date, rangeEnd: Date) {
    const poolIds = sortPool((plan.guardPool as any[]).filter((g) => g.status === 'ACTIVE')).map((g) => g.guardId.toString());
    const floaterIds = sortPool((plan.floaterPool as any[]).filter((g) => g.status === 'ACTIVE')).map((g) => g.guardId.toString());
    const external = await this.loadExternalDuties((plan._id as any).toString(), poolIds.concat(floaterIds), rangeStart, rangeEnd);
    const days = daysInclusive(rangeStart, rangeEnd);
    const cfg = this.buildAlgorithmConfig(plan, rangeStart, days, external);
    const result = buildSchedule(cfg);
    return { cfg, external, ...result };
  }

  static async preview(id: string, startDateStr?: string, endDateStr?: string) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');

    const rangeStart = startOfDay(startDateStr ? new Date(startDateStr) : plan.startDate);
    const rangeEnd = startOfDay(endDateStr ? new Date(endDateStr) : plan.endDate);
    if (rangeEnd.getTime() < rangeStart.getTime()) throw ApiError.badRequest('End date must be on or after start date');
    const days = daysInclusive(rangeStart, rangeEnd);
    if (days > MAX_RANGE_DAYS) throw ApiError.badRequest(`Preview range cannot exceed ${MAX_RANGE_DAYS} days`);

    const { assignments, warnings, uncoveredSlots, external } = await this.solve(plan, rangeStart, rangeEnd);

    const guardIds = Array.from(new Set(assignments.map((a) => a.guardId)));
    const employees = await Employee.find({ _id: { $in: guardIds } }).select('firstName lastName employeeCode');
    const empMap = new Map<string, any>();
    employees.forEach((e) => empMap.set((e._id as any).toString(), e));

    const roster = assignments.map((a) => {
      const emp = empMap.get(a.guardId);
      return {
        date: `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}-${String(a.date.getDate()).padStart(2, '0')}`,
        shiftType: a.shiftType,
        startTime: a.startTime,
        endTime: a.endTime,
        guardId: a.guardId,
        guardName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || '',
        isOverride: a.isOverride,
        source: a.source,
      };
    });

    const siteName = (plan.siteId as any)?.siteName || (await Site.findById(plan.siteId))?.siteName || '';

    const guardStats = (plan.guardPool as any[])
      .filter((g) => g.status === 'ACTIVE')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((g) => {
        const gid = g.guardId.toString();
        const emp = empMap.get(gid) || (g.guardId as any);
        const mine = assignments.filter((a) => a.guardId === gid);
        const hours = mine.reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / HOUR_MS, 0);
        return {
          guardId: gid,
          name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          employeeCode: emp?.employeeCode || '',
          dayShifts: mine.filter((a) => a.shiftType === 'DAY').length,
          nightShifts: mine.filter((a) => a.shiftType === 'NIGHT').length,
          fullShifts: mine.filter((a) => a.shiftType === 'FULL').length,
          totalShifts: mine.length,
          hours: Math.round(hours * 10) / 10,
          overrides: mine.filter((a) => a.isOverride).length,
        };
      });

    const externalByGuard = new Map<string, number>();
    for (const d of external) {
      externalByGuard.set(d.guardId, (externalByGuard.get(d.guardId) || 0) + 1);
    }

    const dayLabel = plan.shiftMode === 'SINGLE_24H'
      ? `${plan.dayStartTime}-next day ${plan.dayStartTime} (24h)`
      : `${plan.dayStartTime}-${plan.dayEndTime}`;
    const nightLabel = plan.shiftMode === 'SINGLE_24H' ? '' : `${plan.nightStartTime}-${plan.nightEndTime}`;

    return {
      plan: {
        id: (plan._id as any).toString(),
        name: plan.name,
        siteName,
        shiftMode: plan.shiftMode,
        dayCount: plan.dayCount,
        nightCount: plan.nightCount,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: plan.status,
      },
      range: { startDate: rangeStart, endDate: rangeEnd, days },
      shiftTimes: { day: dayLabel, night: nightLabel },
      roster,
      guardStats,
      warnings,
      uncoveredSlots,
      externalCommitments: Array.from(externalByGuard.entries()).map(([guardId, count]) => ({
        guardId,
        count,
      })),
    };
  }
  /** Persist the computed schedule into ScheduleAssignment documents. */
  static async generate(
    id: string,
    data: { startDate?: string; endDate?: string; overwrite?: boolean },
    userId: string,
    auditCtx?: { ip?: string; ua?: string }
  ) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');

    const activePool = (plan.guardPool as any[]).filter((g) => g.status === 'ACTIVE').length
      + (plan.floaterPool as any[]).filter((g) => g.status === 'ACTIVE').length;
    if (activePool === 0) throw ApiError.badRequest('No active guards in the pool — add guards first');

    const rangeStart = startOfDay(data.startDate ? new Date(data.startDate) : plan.startDate);
    const rangeEnd = startOfDay(data.endDate ? new Date(data.endDate) : plan.endDate);
    if (rangeEnd.getTime() < rangeStart.getTime()) throw ApiError.badRequest('End date must be on or after start date');
    const days = daysInclusive(rangeStart, rangeEnd);
    if (days > MAX_RANGE_DAYS) throw ApiError.badRequest(`Generation range cannot exceed ${MAX_RANGE_DAYS} days`);

    const { assignments, warnings, uncoveredSlots } = await this.solve(plan, rangeStart, rangeEnd);

    if (data.overwrite !== false) {
      await ScheduleAssignment.deleteMany({
        planId: plan._id,
        date: { $gte: rangeStart, $lte: rangeEnd },
      });
    }

    const docs = assignments.map((a) => ({
      planId: plan._id,
      guardId: new mongoose.Types.ObjectId(a.guardId),
      siteId: plan.siteId,
      date: a.date,
      shiftType: a.shiftType,
      startTime: a.startTime,
      endTime: a.endTime,
      startAt: a.startAt,
      endAt: a.endAt,
      isOverride: a.isOverride,
      assignedBy: new mongoose.Types.ObjectId(userId),
      notes: a.source === 'FLOATER' ? 'Floater coverage' : undefined,
    }));

    const created = docs.length > 0 ? await ScheduleAssignment.insertMany(docs) : [];
    plan.lastGeneratedAt = new Date();
    if (plan.status === 'DRAFT') plan.status = 'PUBLISHED';
    await plan.save();

    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_GENERATE', entity: 'ShiftSchedule', entityId: id,
      newValues: { created: created.length, overrides: assignments.filter((a) => a.isOverride).length, uncovered: uncoveredSlots, days },
      ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    eventBus.emit('hr.shiftSchedule.generated', { planId: id, count: created.length, days });

    return {
      created: created.length,
      days,
      overrides: assignments.filter((a) => a.isOverride).length,
      uncoveredSlots,
      warnings,
    };
  }

  static async getAssignments(id: string, startDateStr?: string, endDateStr?: string) {
    const filter: any = { planId: id };
    if (startDateStr || endDateStr) {
      filter.date = {};
      if (startDateStr) filter.date.$gte = startOfDay(new Date(startDateStr));
      if (endDateStr) filter.date.$lte = startOfDay(new Date(endDateStr));
    }
    return ScheduleAssignment.find(filter)
      .populate('guardId', 'firstName lastName employeeCode')
      .populate('siteId', 'siteName siteCode')
      .sort({ date: 1, startAt: 1 });
  }

  static async clearAssignments(id: string, userId: string, auditCtx?: { ip?: string; ua?: string }) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const result = await ScheduleAssignment.deleteMany({ planId: id });
    plan.status = 'DRAFT';
    await plan.save();
    AuditService.log({
      userId, action: 'SHIFT_SCHEDULE_CLEAR', entity: 'ShiftSchedule', entityId: id,
      newValues: { deleted: result.deletedCount }, ipAddress: auditCtx?.ip, userAgent: auditCtx?.ua,
    });
    return { deleted: result.deletedCount };
  }

  /** All commitments of the pooled guards in a range (from every plan + manual shifts) — for the UI. */
  static async getGuardCommitments(id: string, startDateStr?: string, endDateStr?: string) {
    const plan = await ShiftSchedule.findById(id);
    if (!plan) throw ApiError.notFound('Shift schedule not found');
    const rangeStart = startOfDay(startDateStr ? new Date(startDateStr) : plan.startDate);
    const rangeEnd = startOfDay(endDateStr ? new Date(endDateStr) : plan.endDate);
    const poolIds = sortPool((plan.guardPool as any[])).map((g) => g.guardId.toString());
    const floaterIds = sortPool((plan.floaterPool as any[])).map((g) => g.guardId.toString());
    const duties = await this.loadExternalDuties(id, poolIds.concat(floaterIds), rangeStart, rangeEnd);
    const employees = await Employee.find({ _id: { $in: poolIds.concat(floaterIds) } }).select('firstName lastName employeeCode');
    const empMap = new Map<string, any>();
    employees.forEach((e) => empMap.set((e._id as any).toString(), e));
    return duties.map((d) => {
      const emp = empMap.get(d.guardId);
      return {
        guardId: d.guardId,
        guardName: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        start: d.start,
        end: d.end,
        source: d.source,
      };
    });
  }
}
