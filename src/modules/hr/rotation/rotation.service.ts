import mongoose from 'mongoose';
import { Rotation, IRotation, IShiftDefinition, IRestRule } from '../../../models/Rotation';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { ShiftTemplate } from '../../../models/ShiftTemplate';
import { AttendanceRecord } from '../../../models/AttendanceRecord';
import { Site } from '../../../models/Site';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { eventBus } from '../../../core/events/EventBus';
import { ShiftAssignmentSource } from '../../../types';
import { buildBaseSequence, positiveMod, RotationSlot } from './rotation.formula';
import {
  Cell, ConflictIssue, DutyInterval, EngineInput, EngineConfigError, GenerationReport,
  GuardCtx, LeaveWindow, RestRule, ShiftDefInput, generateSchedule,
} from './engine';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const DAY_MS = 86400000;
const DEFAULT_DAYS = 14;
const PRIOR_DUTY_LOOKBACK_DAYS = 7;
const EDITABLE_STATUSES = new Set(['DRAFT', 'REVIEW', 'APPROVED']);
const GENERATABLE_STATUSES = new Set(['DRAFT', 'GENERATED', 'REVIEW', 'APPROVED']);

function midnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseHM(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function durationHoursOf(startHM: string, endHM: string): number {
  const s = parseHM(startHM);
  const e = parseHM(endHM);
  if (s === null || e === null) return 12;
  if (e === s) return 24;
  if (e < s) return (24 * 60 - s + e) / 60;
  return (e - s) / 60;
}

/**
 * Resolve effective shift definitions for a rotation.
 * New documents store shiftDefinitions; legacy documents only have day/night
 * count + times (night START historically lived in nightEndTime = '18:00').
 */
export function resolveShifts(rot: IRotation): ShiftDefInput[] {
  const defs = (rot.shiftDefinitions || []) as IShiftDefinition[];
  if (defs.length > 0) {
    return defs.map((d) => ({
      key: d.key,
      name: d.name,
      startTime: d.startTime,
      endTime: d.endTime,
      requiredCount: Math.max(0, d.requiredCount | 0),
    }));
  }

  // Legacy synthesis
  const dayStart = rot.dayStartTime || '06:00';
  const dayEnd = rot.dayEndTime || '18:00';
  const nightStartRaw = rot.nightStartTime;
  const nightEndRaw = rot.nightEndTime;

  // Legacy quirk: night start was stored in nightEndTime ('18:00') and
  // nightStartTime is absent. New docs: start='18:00', end='06:00'.
  let nightStart: string;
  let nightEnd: string;
  if (!nightStartRaw) {
    // legacy document
    nightStart = nightEndRaw && nightEndRaw !== '06:00' ? nightEndRaw : '18:00';
    nightEnd = '06:00';
  } else {
    nightStart = nightStartRaw;
    nightEnd = nightEndRaw || '06:00';
  }

  const shiftMode = rot.shiftMode || 'STANDARD_12H';
  const out: ShiftDefInput[] = [];

  if (shiftMode === 'SINGLE_24H') {
    const required = Math.max(1, (rot.dayShiftCount || 0) + (rot.nightShiftCount || 0) || rot.dayShiftCount || 1);
    out.push({ key: 'DAY', name: 'Day Shift', startTime: dayStart, endTime: dayStart, requiredCount: required });
    return out;
  }

  const dayCount = Math.max(0, rot.dayShiftCount ?? 1);
  const nightCount = Math.max(0, rot.nightShiftCount ?? 1);
  if (dayCount > 0) {
    out.push({ key: 'DAY', name: 'Day Shift', startTime: dayStart, endTime: dayEnd, requiredCount: dayCount });
  }
  if (nightCount > 0) {
    out.push({ key: 'NIGHT', name: 'Night Shift', startTime: nightStart, endTime: nightEnd, requiredCount: nightCount });
  }
  if (out.length === 0) {
    out.push({ key: 'DAY', name: 'Day Shift', startTime: dayStart, endTime: dayEnd, requiredCount: 1 });
  }
  return out;
}

function resolveRestRules(rot: IRotation): RestRule[] {
  const rules = (rot.restRules || []) as IRestRule[];
  if (rules.length > 0) {
    return rules.map((r) => ({ maxShiftHours: r.maxShiftHours, minRestHours: r.minRestHours }));
  }
  return [
    { maxShiftHours: 12, minRestHours: 24 },
    { maxShiftHours: 24, minRestHours: 48 },
  ];
}

function cellsToAssignments(rot: IRotation, cells: Cell[], userId: string) {
  return cells.map((c) => {
    const shift = { startTime: '', endTime: '' };
    void shift;
    return {
      rotationId: rot._id,
      guardId: new mongoose.Types.ObjectId(c.guardId),
      siteId: rot.siteId,
      date: midnight(new Date(c.date)),
      shiftType: c.shiftKey,
      shiftName: c.shiftName,
      shiftTime: c.shiftName || c.shiftKey,
      startAt: c.startAt,
      endAt: c.endAt,
      assignedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    };
  });
}

function appendChange(rot: IRotation, action: string, userId: string, details?: string) {
  rot.changeLog.push({
    at: new Date(),
    by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
    action,
    details,
  });
}

export class RotationService {
  // ── legacy formula helper (used by leave-cover suggestions + validation scripts) ──
  static computeDayAssignments(rot: IRotation, date: Date): { guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; shiftTime: string }[] {
    const activeGuards = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE')
      .sort((a: any, b: any) => a.order - b.order);

    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.dayShiftCount + rot.nightShiftCount;
    if (poolSize === 0 || slotCountPerDay === 0) return [];

    const { sequence: baseSequence } = buildBaseSequence(poolSize, rot.dayShiftCount, rot.nightShiftCount);

    const startDate = new Date(rot.startDate);
    startDate.setHours(0, 0, 0, 0);
    const dayIndex = Math.floor((date.getTime() - startDate.getTime()) / DAY_MS);

    const assignments: { guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; shiftTime: string }[] = [];
    const pushAssignment = (guardIndex: number, slotType: RotationSlot) => {
      if (slotType === 'REST') return;
      const guard = activeGuards[guardIndex];
      if (!guard) return;
      const shiftTime = slotType === 'DAY' ? rot.dayStartTime : rot.nightEndTime;
      assignments.push({ guardId: guard.guardId, shiftType: slotType, shiftTime });
    };

    for (let i = 0; i < poolSize; i += 1) {
      pushAssignment(i, baseSequence[positiveMod(dayIndex - i, poolSize)]);
    }

    assignments.sort((a, b) => (a.shiftType === b.shiftType ? 0 : a.shiftType === 'DAY' ? -1 : 1));
    return assignments;
  }

  // ── engine input loading ────────────────────────────────────────────────

  private static async loadGuardCtxs(rot: IRotation): Promise<GuardCtx[]> {
    const entries = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE')
      .sort((a: any, b: any) => a.order - b.order);
    const ids = entries.map((g: any) => g.guardId);
    const docs = await Employee.find({ _id: { $in: ids } })
      .select('firstName lastName employeeCode status category');
    const byId = new Map(docs.map((d: any) => [d._id.toString(), d]));
    const out: GuardCtx[] = [];
    entries.forEach((g: any, idx: number) => {
      const d: any = byId.get(g.guardId.toString());
      if (!d) return;
      out.push({
        id: d._id.toString(),
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.employeeCode || 'Unknown',
        code: d.employeeCode || '',
        order: idx,
        status: d.status || 'ACTIVE',
        category: d.category,
      });
    });
    return out;
  }

  private static async loadExternalDuties(
    poolIds: string[],
    periodStart: Date,
    periodEnd: Date,
    excludeRotationId: string,
  ): Promise<DutyInterval[]> {
    const duties: DutyInterval[] = [];
    const lookback = new Date(periodStart.getTime() - PRIOR_DUTY_LOOKBACK_DAYS * DAY_MS);

    // Other rotation assignments in/near the period (for overlap + rest seeding)
    const ras = await RotationAssignment.find({
      guardId: { $in: poolIds },
      rotationId: { $ne: new mongoose.Types.ObjectId(excludeRotationId) },
      date: { $gte: lookback, $lt: periodEnd },
    }).lean();
    for (const ra of ras as any[]) {
      const start = ra.startAt ? new Date(ra.startAt) : midnight(new Date(ra.date));
      let end = ra.endAt ? new Date(ra.endAt) : null;
      if (!end) {
        // synthesize from shift key / times when timestamps missing (legacy)
        const dur = durationHoursOf(ra.shiftTime || '', ra.shiftTime || '');
        // shiftTime historically was a start label; default 12h if unknown
        const hours = ra.shiftType === 'NIGHT' || (ra.shiftType || '').toUpperCase().includes('NIGHT') ? 12 : 12;
        void dur;
        end = new Date(start.getTime() + hours * 3600000);
        if (ra.shiftType === 'DAY' || (ra.shiftType || '').toUpperCase() === 'DAY') {
          end = new Date(start.getTime() + 12 * 3600000);
        }
      }
      duties.push({
        guardId: ra.guardId.toString(),
        start,
        end,
        siteId: ra.siteId?.toString?.(),
        label: ra.shiftType,
        source: 'ROTATION',
      });
    }

    // Manual ShiftAssignments (join templates for times)
    const sas = await ShiftAssignment.find({
      guardId: { $in: poolIds },
      status: 'ACTIVE',
      source: { $ne: ShiftAssignmentSource.ROTATION },
      startDate: { $lt: periodEnd },
      $or: [{ endDate: { $gte: lookback } }, { endDate: null }, { endDate: { $exists: false } }],
    }).lean();
    const templateIds = [...new Set(sas.map((s: any) => s.shiftTemplateId?.toString()).filter(Boolean))];
    const templates = await ShiftTemplate.find({ _id: { $in: templateIds } }).lean();
    const tmplById = new Map(templates.map((t: any) => [t._id.toString(), t]));
    for (const sa of sas as any[]) {
      const tmpl: any = tmplById.get(sa.shiftTemplateId?.toString?.() || '');
      if (!tmpl) continue;
      const durH = durationHoursOf(tmpl.startTime, tmpl.endTime);
      const d = midnight(new Date(sa.startDate));
      const startMin = parseHM(tmpl.startTime);
      const start = new Date(d.getTime() + (startMin ?? 0) * 60000);
      const end = new Date(start.getTime() + durH * 3600000);
      if (end.getTime() < lookback.getTime() || start.getTime() > periodEnd.getTime()) continue;
      duties.push({
        guardId: sa.guardId.toString(),
        start,
        end,
        siteId: sa.siteId?.toString?.(),
        label: tmpl.name,
        source: 'MANUAL',
      });
    }

    // Attendance clock-in/out as actual duties (only when both present)
    const att = await AttendanceRecord.find({
      guardId: { $in: poolIds },
      date: { $gte: lookback, $lt: periodEnd },
      clockIn: { $ne: null },
      clockOut: { $ne: null },
    }).lean();
    for (const a of att as any[]) {
      duties.push({
        guardId: a.guardId.toString(),
        start: new Date(a.clockIn),
        end: new Date(a.clockOut),
        siteId: a.siteId?.toString?.(),
        label: 'Attendance',
        source: 'ATTENDANCE',
      });
    }

    return duties;
  }

  private static buildLeaveWindows(rot: IRotation, periodStart: Date, periodEnd: Date): LeaveWindow[] {
    const out: LeaveWindow[] = [];
    for (const lc of (rot.leaveCoverages as any[]) || []) {
      const s = new Date(lc.startDate);
      const e = new Date(lc.endDate);
      if (e.getTime() < periodStart.getTime() || s.getTime() > periodEnd.getTime()) continue;
      out.push({ guardId: lc.guardId.toString(), start: s, end: e });
    }
    return out;
  }

  private static periodBounds(rot: IRotation, days?: number, startDate?: string): { start: Date; days: number } {
    let start: Date;
    if (startDate) start = midnight(new Date(startDate));
    else if (rot.startDate) start = midnight(new Date(rot.startDate));
    else start = midnight(new Date());

    let n = days && days > 0 ? Math.floor(days) : 0;
    if (!n && rot.endDate) {
      n = Math.round((midnight(new Date(rot.endDate)).getTime() - start.getTime()) / DAY_MS) + 1;
    }
    if (!n) n = DEFAULT_DAYS;
    if (n > 366) n = 366;
    return { start, days: n };
  }

  private static async buildEngineInput(rot: IRotation, start: Date, days: number): Promise<EngineInput> {
    const pool = await this.loadGuardCtxs(rot);
    const poolIds = pool.map((g) => g.id);
    const periodEnd = new Date(start.getTime() + days * DAY_MS);
    const externalDuties = await this.loadExternalDuties(poolIds, start, periodEnd, rot._id.toString());
    const leaveWindows = this.buildLeaveWindows(rot, start, periodEnd);
    const onLeaveIds = pool.filter((g) => g.status === 'ON_LEAVE').map((g) => g.id);

    return {
      shifts: resolveShifts(rot),
      restRules: resolveRestRules(rot),
      pool,
      startDate: start,
      days,
      externalDuties,
      leaveWindows,
      onLeaveGuards: onLeaveIds,
    };
  }

  private static runEngine(input: EngineInput): GenerationReport {
    try {
      return generateSchedule(input);
    } catch (e: any) {
      if (e instanceof EngineConfigError) throw ApiError.badRequest(e.message);
      throw e;
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────

  static async create(data: {
    name: string;
    description?: string;
    siteId: string;
    shiftMode?: 'STANDARD_12H' | 'SINGLE_24H' | 'CUSTOM';
    shiftDefinitions?: IShiftDefinition[];
    dayShiftCount: number;
    nightShiftCount: number;
    dayStartTime?: string;
    dayEndTime?: string;
    nightStartTime?: string;
    nightEndTime?: string;
    restRules?: IRestRule[];
    startDate: string;
    endDate?: string;
  }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const site = await Site.findById(data.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const shiftMode = data.shiftMode || 'STANDARD_12H';
    let defs: IShiftDefinition[] = [];
    if (data.shiftDefinitions && data.shiftDefinitions.length > 0) {
      defs = data.shiftDefinitions.map((d) => ({
        key: String(d.key || '').trim(),
        name: String(d.name || d.key || '').trim(),
        startTime: String(d.startTime || '06:00'),
        endTime: String(d.endTime || '18:00'),
        requiredCount: Math.max(0, Math.floor(Number(d.requiredCount) || 0)),
      }));
      for (const d of defs) {
        if (!d.key) throw ApiError.badRequest('Each shift needs a key');
        if (parseHM(d.startTime) === null || parseHM(d.endTime) === null) {
          throw ApiError.badRequest(`Shift "${d.key}" has an invalid time (use HH:MM)`);
        }
      }
      const keys = new Set(defs.map((d) => d.key));
      if (keys.size !== defs.length) throw ApiError.badRequest('Shift keys must be unique');
      const total = defs.reduce((s, d) => s + d.requiredCount, 0);
      if (total < 1) throw ApiError.badRequest('Total daily requirement must be at least 1 guard');
    } else {
      const dayCount = Math.max(0, Number(data.dayShiftCount) || 0);
      const nightCount = Math.max(0, Number(data.nightShiftCount) || 0);
      // Relaxed: allow 0 on either side (24h mode uses night=0); total >= 1
      if (dayCount + nightCount < 1) {
        throw ApiError.badRequest('Total working positions must be at least 1 (set day and/or night guards)');
      }
      if (shiftMode === 'SINGLE_24H') {
        defs = [{
          key: 'DAY',
          name: 'Day Shift',
          startTime: data.dayStartTime || '06:00',
          endTime: data.dayStartTime || '06:00',
          requiredCount: dayCount + nightCount,
        }];
      } else {
        if (dayCount > 0) {
          defs.push({
            key: 'DAY',
            name: 'Day Shift',
            startTime: data.dayStartTime || '06:00',
            endTime: data.dayEndTime || '18:00',
            requiredCount: dayCount,
          });
        }
        if (nightCount > 0) {
          const legacyNightStart = data.nightEndTime && data.nightEndTime !== '06:00' ? data.nightEndTime : undefined;
          defs.push({
            key: 'NIGHT',
            name: 'Night Shift',
            startTime: data.nightStartTime || legacyNightStart || '18:00',
            endTime: data.nightEndTime && data.nightEndTime !== (data.nightStartTime || '18:00')
              ? data.nightEndTime
              : (data.nightStartTime || '18:00') === '18:00' ? '06:00' : data.nightEndTime || '06:00',
            requiredCount: nightCount,
          });
        }
      }
    }

    const rotation = await Rotation.create({
      name: data.name,
      description: data.description,
      siteId: data.siteId,
      shiftMode,
      shiftDefinitions: defs,
      dayShiftCount: defs.find((d) => d.key === 'DAY')?.requiredCount ?? Math.max(0, Number(data.dayShiftCount) || 0),
      nightShiftCount: shiftMode === 'SINGLE_24H' ? 0 : (defs.find((d) => d.key === 'NIGHT')?.requiredCount ?? Math.max(0, Number(data.nightShiftCount) || 0)),
      dayStartTime: data.dayStartTime || '06:00',
      dayEndTime: data.dayEndTime || '18:00',
      nightStartTime: data.nightStartTime || '18:00',
      nightEndTime: data.nightEndTime || '06:00',
      restRules: data.restRules && data.restRules.length > 0 ? data.restRules : undefined,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: 'DRAFT',
      guardPool: [],
      floaterPool: [],
      leaveCoverages: [],
      createdBy: userId,
    });
    appendChange(rotation, 'CREATE', userId, `Created rotation "${rotation.name}"`);
    await rotation.save();

    eventBus.emit('hr.rotation.created', { rotationId: rotation._id, name: rotation.name });
    return rotation;
  }

  static async getAll(filters?: { status?: string; search?: string }) {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.search) query.name = { $regex: filters.search, $options: 'i' };
    return Rotation.find(query).sort({ createdAt: -1 }).populate('siteId', 'siteName siteCode');
  }

  static async getById(id: string) {
    const rot = await Rotation.findById(id)
      .populate('siteId', 'siteName siteCode')
      .populate('guardPool.guardId', 'firstName lastName employeeCode status')
      .populate('floaterPool.guardId', 'firstName lastName employeeCode status');
    if (!rot) throw ApiError.notFound('Rotation not found');
    return rot;
  }

  static async update(id: string, data: any, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    if (!EDITABLE_STATUSES.has(rotation.status)) {
      throw ApiError.badRequest('Only DRAFT, REVIEW, or APPROVED rotations can be edited');
    }

    const wasApproved = rotation.status === 'APPROVED';
    const wasReview = rotation.status === 'REVIEW';

    const allowed = [
      'name', 'description', 'startDate', 'endDate',
      'dayShiftCount', 'nightShiftCount',
      'dayStartTime', 'dayEndTime', 'nightStartTime', 'nightEndTime',
      'shiftMode', 'shiftDefinitions', 'restRules',
    ];
    const changed: string[] = [];
    for (const key of allowed) {
      if (data[key] !== undefined && JSON.stringify((rotation as any)[key]) !== JSON.stringify(data[key])) {
        (rotation as any)[key] = data[key];
        changed.push(key);
      }
    }

    // Editing after review/approval invalidates the prior generation
    if ((wasApproved || wasReview) && changed.length > 0) {
      if (rotation.generation) rotation.generation.stale = true;
      rotation.status = 'DRAFT';
      appendChange(rotation, 'EDIT_STALE', userId, `Edited (${changed.join(', ')}) — returned to DRAFT, regenerate required`);
    } else if (changed.length > 0) {
      appendChange(rotation, 'EDIT', userId, `Updated ${changed.join(', ')}`);
    }

    await rotation.save();
    return rotation;
  }

  static async delete(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    await RotationAssignment.deleteMany({ rotationId: id });
    await ShiftAssignment.deleteMany({ rotationId: id, source: ShiftAssignmentSource.ROTATION });
    await Rotation.findByIdAndDelete(id);
    eventBus.emit('hr.rotation.deleted', { rotationId: id });
  }

  static async addGuards(id: string, guardIds: string[], userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    if (rotation.generation) rotation.generation.stale = true;

    let added = 0;
    for (const gid of guardIds) {
      const exists = (rotation.guardPool as any[]).find((g: any) => g.guardId.toString() === gid);
      if (!exists) {
        (rotation.guardPool as any[]).push({
          guardId: new mongoose.Types.ObjectId(gid),
          status: 'ACTIVE',
          order: (rotation.guardPool as any[]).length,
        });
        added += 1;
      }
    }
    if (added > 0) appendChange(rotation, 'ADD_GUARDS', userId, `Added ${added} guard(s) to pool`);
    await rotation.save();
    return rotation;
  }

  static async removeGuard(id: string, guardId: string, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    if (rotation.generation) rotation.generation.stale = true;
    rotation.guardPool = (rotation.guardPool as any[]).filter((g: any) => g.guardId.toString() !== guardId) as any[];
    (rotation.guardPool as any[]).forEach((g: any, i: number) => { g.order = i; });
    appendChange(rotation, 'REMOVE_GUARD', userId, 'Removed guard from pool');
    await rotation.save();
    return rotation;
  }

  static async reorderPool(id: string, orderedGuardIds: string[], userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    if (rotation.generation) rotation.generation.stale = true;

    const poolMap = new Map((rotation.guardPool as any[]).map((g: any) => [g.guardId.toString(), g]));
    rotation.guardPool = orderedGuardIds.map((gid: string, i: number) => {
      const existing = poolMap.get(gid);
      return { guardId: new mongoose.Types.ObjectId(gid), status: existing?.status || 'ACTIVE', order: i };
    }) as any[];
    appendChange(rotation, 'REORDER_POOL', userId, 'Reordered guard pool');
    await rotation.save();
    return rotation;
  }

  static async addFloaters(id: string, guardIds: string[], _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    for (const gid of guardIds) {
      const exists = (rotation.floaterPool as any[]).find((g: any) => g.guardId.toString() === gid);
      if (!exists) {
        (rotation.floaterPool as any[]).push({ guardId: new mongoose.Types.ObjectId(gid), status: 'ACTIVE' });
      }
    }
    await rotation.save();
    return rotation;
  }

  static async removeFloater(id: string, guardId: string, _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    rotation.floaterPool = (rotation.floaterPool as any[]).filter((g: any) => g.guardId.toString() !== guardId) as any[];
    await rotation.save();
    return rotation;
  }

  static checkFairness(poolSize: number, slotCountPerDay: number) {
    if (poolSize <= 0 || slotCountPerDay <= 0) return { isFair: true, cycleDays: 0 };
    if (poolSize < slotCountPerDay) return { isFair: false, message: `Need at least ${slotCountPerDay} guards, have ${poolSize}` };
    const cycleDays = poolSize / gcd(poolSize, slotCountPerDay);
    const workDaysPerCycle = cycleDays * slotCountPerDay / poolSize;
    return {
      isFair: true,
      cycleDays,
      workDaysPerCycle,
      dutyPercent: Math.round((slotCountPerDay / poolSize) * 100),
    };
  }

  // ── preview / generate / validate ──────────────────────────────────────

  static async preview(id: string, days?: number, startDate?: string) {
    const rot = await Rotation.findById(id).populate('siteId', 'siteName siteCode');
    if (!rot) throw ApiError.notFound('Rotation not found');
    if ((rot.guardPool as any[]).filter((g: any) => g.status === 'ACTIVE').length === 0) {
      throw ApiError.badRequest('No active guards in pool');
    }

    const { start, days: n } = this.periodBounds(rot, days, startDate);
    const input = await this.buildEngineInput(rot, start, n);
    const report = this.runEngine(input);

    const shiftDefs = resolveShifts(rot);
    const poolSize = input.pool.length;
    const slotCountPerDay = shiftDefs.reduce((s, d) => s + d.requiredCount, 0);

    // Map cells into the legacy response shape + new engine payload
    const guardMeta = new Map(input.pool.map((g) => [g.id, g]));
    const assignments = report.cells.map((c) => {
      const g = guardMeta.get(c.guardId);
      return {
        date: new Date(c.date),
        guardId: c.guardId,
        shiftType: c.shiftKey === 'DAY' || c.shiftKey === 'NIGHT' ? c.shiftKey : (c.shiftKey as any),
        shiftTime: `${c.startAt.toTimeString().slice(0, 5)}-${c.endAt.toTimeString().slice(0, 5)}`,
        slotIndex: c.slotIndex,
        shiftKey: c.shiftKey,
        shiftName: c.shiftName,
        startAt: c.startAt,
        endAt: c.endAt,
        guard: g ? { _id: g.id, firstName: g.name.split(' ')[0], lastName: g.name.split(' ').slice(1).join(' '), employeeCode: g.code, status: g.status } : null,
      };
    });

    const guardStats = input.pool.map((g) => {
      const mine = report.cells.filter((c) => c.guardId === g.id);
      const dayShifts = mine.filter((c) => c.shiftKey === 'DAY').length;
      const nightShifts = mine.filter((c) => c.shiftKey !== 'DAY').length;
      return {
        guardId: g.id,
        name: g.name,
        employeeCode: g.code,
        dayShifts,
        nightShifts,
        totalShifts: mine.length,
        restDays: n - mine.length,
        hours: report.stats.workloads.find((w) => w.guardId === g.id)?.hours ?? 0,
      };
    });

    const dayDef = shiftDefs.find((d) => d.key === 'DAY');
    const nightDef = shiftDefs.find((d) => d.key === 'NIGHT');

    return {
      // legacy keys
      assignments,
      shiftTimes: { day: dayDef ? `${dayDef.startTime}-${dayDef.endTime}` : '', night: nightDef ? `${nightDef.startTime}-${nightDef.endTime}` : '' },
      siteName: (rot.siteId as any)?.siteName || '',
      poolSize,
      slotCountPerDay,
      cycleDays: poolSize / Math.max(1, gcd(poolSize, Math.max(1, slotCountPerDay))),
      guardStats,
      // engine keys
      days: n,
      startDate: start,
      cells: report.cells,
      conflicts: report.conflicts,
      stats: report.stats,
      feasibility: report.feasibility,
      warnings: report.warnings,
      algorithmVersion: report.algorithmVersion,
      rulesFingerprint: report.rulesFingerprint,
      restRules: input.restRules,
      shiftDefinitions: shiftDefs,
    };
  }

  static async generate(id: string, days?: number, userId?: string, _auditCtx?: { ip?: string; ua?: string }, startDate?: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (!GENERATABLE_STATUSES.has(rot.status)) {
      throw ApiError.badRequest(`Cannot generate a ${rot.status} rotation (cancel or archive it first)`);
    }
    if ((rot.guardPool as any[]).filter((g: any) => g.status === 'ACTIVE').length === 0) {
      throw ApiError.badRequest('No active guards in pool');
    }

    const { start, days: n } = this.periodBounds(rot, days, startDate);
    const input = await this.buildEngineInput(rot, start, n);
    const report = this.runEngine(input);

    await RotationAssignment.deleteMany({ rotationId: id });
    const docs = cellsToAssignments(rot, report.cells, userId || '');
    if (docs.length > 0) await RotationAssignment.insertMany(docs);

    rot.lastGeneratedDate = new Date();
    rot.generation = {
      generatedAt: new Date(),
      generatedBy: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      days: n,
      algorithmVersion: report.algorithmVersion,
      rulesFingerprint: report.rulesFingerprint,
      conflictCount: report.conflicts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').length,
      feasibility: report.feasibility,
      stale: false,
      stats: report.stats as any,
      conflicts: report.conflicts as any,
    };
    // DRAFT/GENERATED -> REVIEW; APPROVED regenerations fall back to REVIEW
    rot.status = 'REVIEW';
    appendChange(rot, 'GENERATE', userId || '', `Generated ${n} day(s), ${docs.length} assignment(s), ${report.feasibility}`);
    await rot.save();

    eventBus.emit('hr.rotation.generated', { rotationId: id, count: docs.length, days: n });
    return {
      count: docs.length,
      days: n,
      startDate: start,
      conflicts: report.conflicts,
      stats: report.stats,
      feasibility: report.feasibility,
      warnings: report.warnings,
      status: rot.status,
    };
  }

  /** Re-validate the schedule currently stored in RotationAssignment. */
  static async validate(id: string, days?: number, startDate?: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');

    const { start, days: n } = this.periodBounds(rot, days, startDate);
    const input = await this.buildEngineInput(rot, start, n);

    // Build cells from STORED assignments (not a fresh seed)
    const periodEnd = new Date(start.getTime() + n * DAY_MS);
    const stored = await RotationAssignment.find({
      rotationId: id,
      date: { $gte: start, $lt: periodEnd },
    }).lean();
    const shiftList = resolveShifts(rot);
    const shiftByKey = new Map(shiftList.map((s) => [s.key, s]));
    const cells: Cell[] = (stored as any[]).map((ra, idx) => {
      const def = shiftByKey.get(ra.shiftType);
      const startAt = ra.startAt ? new Date(ra.startAt) : (() => {
        const d = midnight(new Date(ra.date));
        const sm = parseHM(def?.startTime || ra.shiftTime || '06:00') ?? 0;
        return new Date(d.getTime() + sm * 60000);
      })();
      const endAt = ra.endAt ? new Date(ra.endAt) : (() => {
        const dur = def ? durationHoursOf(def.startTime, def.endTime) : 12;
        return new Date(startAt.getTime() + dur * 3600000);
      })();
      return {
        guardId: ra.guardId.toString(),
        dayIndex: Math.round((midnight(new Date(ra.date)).getTime() - start.getTime()) / DAY_MS),
        date: ymdLocal(new Date(ra.date)),
        shiftKey: ra.shiftType,
        shiftName: ra.shiftName || ra.shiftType,
        slotIndex: idx,
        startAt,
        endAt,
      };
    });

    // validateCells is re-exported through engine index
    const { validateCells } = await import('./engine');
    const nameById = new Map(input.pool.map((g) => [g.id, g.name]));
    const result = validateCells(
      {
        cells,
        pool: input.pool,
        shifts: shiftList.map((s) => ({
          key: s.key,
          name: s.name,
          startMin: parseHM(s.startTime) ?? 0,
          endMin: parseHM(s.endTime) ?? 0,
          crossesMidnight: (parseHM(s.endTime) ?? 0) <= (parseHM(s.startTime) ?? 0),
          durationHours: durationHoursOf(s.startTime, s.endTime),
          requiredCount: s.requiredCount,
        })),
        restRules: input.restRules,
        startDate: start,
        days: n,
        externalDuties: input.externalDuties,
        leaveWindows: input.leaveWindows,
        onLeaveGuards: input.onLeaveGuards,
      },
      nameById,
    );

    return {
      ok: result.ok,
      issues: result.issues,
      conflicts: result.conflicts,
      checked: cells.length,
      days: n,
      feasibility: result.ok ? 'FULLY_COMPLIANT' : 'BEST_POSSIBLE' as const,
    };
  }

  static async getStats(id: string, days?: number, startDate?: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.generation?.stats && !rot.generation.stale) {
      return { ...(rot.generation.stats as any), stale: false, feasibility: rot.generation.feasibility };
    }
    // fall back to a live preview calculation
    const preview = await this.preview(id, days, startDate);
    return { ...preview.stats, stale: !!rot.generation?.stale, feasibility: preview.feasibility };
  }

  static async getConflicts(id: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    return {
      conflicts: (rot.generation?.conflicts as any[]) || [],
      conflictCount: rot.generation?.conflictCount ?? 0,
      feasibility: rot.generation?.feasibility,
      stale: !!rot.generation?.stale,
      generatedAt: rot.generation?.generatedAt,
    };
  }

  // ── lifecycle ───────────────────────────────────────────────────────────

  static async approve(id: string, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status !== 'REVIEW') throw ApiError.badRequest('Only rotations in REVIEW can be approved');
    if (!rot.generation || rot.generation.stale) {
      throw ApiError.badRequest('Generate the schedule before approving');
    }
    if ((rot.generation.conflictCount ?? 0) > 0 && rot.generation.feasibility !== 'BEST_POSSIBLE') {
      // BEST_POSSIBLE is allowed with explicit acknowledgement; hard-block only if metadata missing
    }
    rot.status = 'APPROVED';
    appendChange(rot, 'APPROVE', userId, `Feasibility: ${rot.generation.feasibility}`);
    await rot.save();
    eventBus.emit('hr.rotation.approved', { rotationId: id });
    return rot;
  }

  static async publish(id: string, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status !== 'APPROVED') throw ApiError.badRequest('Only APPROVED rotations can be published');
    if (!rot.generation || rot.generation.stale) throw ApiError.badRequest('Regenerate before publishing');

    const assignments = await RotationAssignment.find({ rotationId: id }).lean();
    if (assignments.length === 0) throw ApiError.badRequest('No generated assignments to publish');

    // Ensure ShiftTemplates exist for each shift definition
    const shiftList = resolveShifts(rot);
    const templateIdByKey = new Map<string, mongoose.Types.ObjectId>();
    for (const s of shiftList) {
      const preferredName = `${rot.name} — ${s.name}`;
      let tmpl = await ShiftTemplate.findOne({ name: preferredName, siteId: rot.siteId });
      if (!tmpl) {
        // globally unique name: suffix on conflict
        let name = preferredName;
        let attempt = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await ShiftTemplate.findOne({ name }) && attempt < 50) {
          name = `${preferredName} (${attempt})`;
          attempt += 1;
        }
        const shiftType = s.key.toUpperCase().includes('NIGHT') ? 'NIGHT'
          : s.key.toUpperCase().includes('DAY') ? 'DAY' : 'MIXED';
        // eslint-disable-next-line no-await-in-loop
        tmpl = await ShiftTemplate.create({
          name,
          description: `Auto-created for rotation "${rot.name}"`,
          siteId: rot.siteId,
          shiftType,
          startTime: s.startTime,
          endTime: s.endTime,
          minGuards: Math.max(1, Math.min(s.requiredCount, 1)),
          maxGuards: Math.max(1, s.requiredCount),
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
          active: true,
          color: shiftType === 'NIGHT' ? '#7D4E24' : '#FFC107',
        });
      }
      templateIdByKey.set(s.key, tmpl._id as mongoose.Types.ObjectId);
    }

    // Replace any previous published shift assignments for this rotation
    await ShiftAssignment.deleteMany({ rotationId: id, source: ShiftAssignmentSource.ROTATION });

    const shiftDocs = assignments.map((ra: any) => {
      const templateId = templateIdByKey.get(ra.shiftType);
      if (!templateId) throw ApiError.badRequest(`No shift template for key "${ra.shiftType}"`);
      const d = midnight(new Date(ra.date));
      return {
        guardId: ra.guardId,
        siteId: ra.siteId,
        shiftTemplateId: templateId,
        startDate: d,
        endDate: d,
        status: 'ACTIVE' as const,
        source: ShiftAssignmentSource.ROTATION,
        rotationId: rot._id,
        assignedById: new mongoose.Types.ObjectId(userId),
      };
    });
    if (shiftDocs.length > 0) await ShiftAssignment.insertMany(shiftDocs);

    rot.status = 'PUBLISHED';
    appendChange(rot, 'PUBLISH', userId, `Published ${shiftDocs.length} shift assignment(s)`);
    await rot.save();
    eventBus.emit('hr.rotation.published', { rotationId: id, count: shiftDocs.length });

    // Auto-activate when the period has already started
    const startMid = midnight(new Date(rot.startDate));
    if (startMid.getTime() <= Date.now()) {
      rot.status = 'ACTIVE';
      appendChange(rot, 'ACTIVATE', userId, 'Auto-activated (start date reached)');
      await rot.save();
      eventBus.emit('hr.rotation.activated', { rotationId: id });
    }

    return rot;
  }

  static async getAssignments(id: string, startDate?: string, endDate?: string) {
    const filter: any = { rotationId: id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    return RotationAssignment.find(filter)
      .populate('guardId', 'firstName lastName employeeCode')
      .sort({ date: 1, shiftType: 1 });
  }

  static async activate(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status === 'ACTIVE') throw ApiError.badRequest('Already active');
    if (!['PUBLISHED', 'PAUSED', 'APPROVED'].includes(rot.status)) {
      throw ApiError.badRequest('Publish the rotation before activating');
    }
    rot.status = 'ACTIVE';
    await rot.save();
    eventBus.emit('hr.rotation.activated', { rotationId: id });
    return rot;
  }

  static async pause(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status !== 'ACTIVE') throw ApiError.badRequest('Can only pause ACTIVE rotations');
    rot.status = 'PAUSED';
    await rot.save();
    eventBus.emit('hr.rotation.paused', { rotationId: id });
    return rot;
  }

  static async archive(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    rot.status = 'ARCHIVED';
    await rot.save();
    eventBus.emit('hr.rotation.archived', { rotationId: id });
    return rot;
  }

  static async complete(id: string, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (!['PUBLISHED', 'ACTIVE', 'PAUSED', 'COMPLETED'].includes(rot.status)) {
      throw ApiError.badRequest('Only published rotations can be completed');
    }
    rot.status = 'COMPLETED';
    appendChange(rot, 'COMPLETE', userId);
    await rot.save();
    eventBus.emit('hr.rotation.completed', { rotationId: id });
    return rot;
  }

  static async cancel(id: string, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(rot.status)) {
      throw ApiError.badRequest(`Cannot cancel a ${rot.status} rotation`);
    }
    rot.status = 'CANCELLED';
    appendChange(rot, 'CANCEL', userId);
    await rot.save();
    eventBus.emit('hr.rotation.cancelled', { rotationId: id });
    return rot;
  }

  // ── same-day move / override ───────────────────────────────────────────

  /**
   * Move a cell's guard within the same day (reassign to a resting pool guard,
   * or swap two working guards). Coverage is preserved by construction.
   * Violations -> 409 with the violation list (unless override).
   */
  static async move(id: string, data: {
    date: string;
    fromGuardId: string;
    toGuardId: string;
    shiftKey?: string;
    override?: boolean;
  }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (!data.date || !data.fromGuardId || !data.toGuardId) {
      throw ApiError.badRequest('date, fromGuardId, and toGuardId are required');
    }
    if (data.fromGuardId === data.toGuardId) throw ApiError.badRequest('Source and target guard are the same');

    const day = midnight(new Date(data.date));
    const dayEnd = new Date(day.getTime() + DAY_MS);

    const dayAssigns = await RotationAssignment.find({
      rotationId: id,
      date: { $gte: day, $lt: dayEnd },
    }).lean();
    if (dayAssigns.length === 0) throw ApiError.notFound('No assignments on that date');

    const source = (dayAssigns as any[]).find(
      (a) => a.guardId.toString() === data.fromGuardId && (!data.shiftKey || a.shiftType === data.shiftKey),
    );
    if (!source) throw ApiError.notFound('Source assignment not found on that date');

    const targetWorking = (dayAssigns as any[]).find(
      (a) => a.guardId.toString() === data.toGuardId,
    );

    // Build constraint check via engine input + stored cells for that day
    const { start, days: n } = this.periodBounds(rot);
    const input = await this.buildEngineInput(rot, start, n);
    const shiftList = resolveShifts(rot);
    const shiftByKey = new Map(shiftList.map((s) => [s.key, s]));

    // Simulate the move: fromGuard loses source cell; toGuard gains it (or swaps)
    const poolIds = input.pool.map((g) => g.id);
    if (!poolIds.includes(data.toGuardId)) throw ApiError.badRequest('Target guard is not in this rotation pool');

    const violations = await this.checkMoveFeasible(input, rot, dayAssigns as any[], source, targetWorking, data.toGuardId, data.fromGuardId);

    if (violations.length > 0 && !data.override) {
      const err = new ApiError(409, violations[0]) as any;
      err.violations = violations;
      throw err;
    }

    if (targetWorking) {
      // swap guard ids on the two assignments
      await RotationAssignment.updateOne({ _id: source._id }, { guardId: data.toGuardId });
      await RotationAssignment.updateOne({ _id: targetWorking._id }, { guardId: data.fromGuardId });
    } else {
      await RotationAssignment.updateOne({ _id: source._id }, { guardId: data.toGuardId });
    }

    if (rot.generation) {
      rot.generation.stale = false; // move keeps coverage; stats refreshed lazily
      rot.generation.conflicts = [];
      rot.generation.conflictCount = violations.length;
      rot.generation.feasibility = violations.length === 0 ? 'FULLY_COMPLIANT' : 'BEST_POSSIBLE';
    }
    appendChange(
      rot,
      data.override ? 'MOVE_OVERRIDE' : 'MOVE',
      userId,
      `Moved ${ymdLocal(day)} assignment: ${data.fromGuardId} -> ${data.toGuardId}${violations.length ? ` (${violations.length} violation(s) overridden)` : ''}`,
    );
    await rot.save();
    eventBus.emit('hr.rotation.moved', { rotationId: id, date: day, override: !!data.override });
    return { ok: true, violations };
  }

  private static async checkMoveFeasible(
    input: EngineInput,
    rot: IRotation,
    dayAssigns: any[],
    source: any,
    targetWorking: any | undefined,
    toGuardId: string,
    fromGuardId: string,
  ): Promise<string[]> {
    // Minimal timestamp-based checks for the two affected guards
    const shiftList = resolveShifts(rot);
    const srcDef = shiftList.find((s) => s.key === source.shiftType);
    const violations: string[] = [];
    const startAt = source.startAt ? new Date(source.startAt) : new Date(midnight(new Date(source.date)).getTime() + (parseHM(srcDef?.startTime || '06:00') ?? 0) * 60000);
    const durH = srcDef ? durationHoursOf(srcDef.startTime, srcDef.endTime) : 12;
    const endAt = source.endAt ? new Date(source.endAt) : new Date(startAt.getTime() + durH * 3600000);

    const dutiesFor = (guardId: string, excludeId?: any): DutyInterval[] => {
      const out = input.externalDuties.filter((d) => d.guardId === guardId);
      for (const a of dayAssigns) {
        if (excludeId && a._id.toString() === excludeId.toString()) continue;
        if (a.guardId.toString() !== guardId) continue;
        const def = shiftList.find((s) => s.key === a.shiftType);
        const s0 = a.startAt ? new Date(a.startAt) : midnight(new Date(a.date));
        const h = def ? durationHoursOf(def.startTime, def.endTime) : 12;
        out.push({ guardId, start: s0, end: a.endAt ? new Date(a.endAt) : new Date(s0.getTime() + h * 3600000) });
      }
      // other days of this rotation for rest-before/after
      return out;
    };

    // leave / on leave
    if (input.onLeaveGuards.includes(toGuardId)) {
      violations.push('Target guard is on leave');
    }
    for (const w of input.leaveWindows) {
      if (w.guardId === toGuardId && startAt < w.end && w.start < endAt) {
        violations.push('Target guard has declared leave covering this shift');
      }
    }

    // target must not already work this shift (swap) without freeing it
    if (targetWorking) {
      // swap: target's current duty goes to fromGuard — check both directions lightly
      // (full check would re-run engine; we flag only clear overlaps/rest issues)
    }

    // overlap for target with external duties
    const targetDuties = dutiesFor(toGuardId, targetWorking?._id);
    for (const d of targetDuties) {
      if (startAt < d.end && d.start < endAt) {
        violations.push(`Target guard already has duty ${d.start.toLocaleString('en-GB')} – ${d.end.toLocaleString('en-GB')}`);
        break;
      }
    }

    // rest before: target's most recent duty end
    let prevEnd: Date | null = null;
    for (const d of targetDuties) {
      if (d.end <= startAt && (!prevEnd || d.end > prevEnd)) prevEnd = d.end;
    }
    if (prevEnd) {
      const needH = 24; // default 12h-rule; refined per actual prior duration if known
      // use restRules from rotation
      const rules = resolveRestRules(rot);
      // approximate prior duration as 12h when unknown — check with duration if we have interval
      let prevStart: Date | null = null;
      for (const d of targetDuties) {
        if (d.end === prevEnd) { prevStart = d.start; break; }
      }
      const prevDur = prevStart ? (prevEnd.getTime() - prevStart.getTime()) / 3600000 : 12;
      let required = needH;
      const sorted = [...rules].sort((a, b) => a.maxShiftHours - b.maxShiftHours);
      for (const r of sorted) {
        if (prevDur <= r.maxShiftHours + 1e-9) { required = r.minRestHours; break; }
      }
      const actualH = (startAt.getTime() - prevEnd.getTime()) / 3600000;
      if (actualH < required) {
        violations.push(`Target guard would only rest ${Math.round(actualH)}h (needs ${required}h)`);
      }
    }

    return violations;
  }

  /** Day-scoped rotate: cyclically reassign the day's guards across its cells. */
  static async rotate(id: string, data: { date?: string; dayIndex?: number; steps?: number; override?: boolean }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');

    const steps = data.steps === undefined || data.steps === null ? 1 : Math.trunc(Number(data.steps)) || 1;

    // Day-scoped when date given (legacy frontend contract), else rotate pool order + regenerate
    if (data.date || data.dayIndex !== undefined) {
      const day = data.date
        ? midnight(new Date(data.date))
        : (() => {
            const { start } = this.periodBounds(rot);
            const idx = Math.max(0, Math.trunc(Number(data.dayIndex)) || 0);
            return new Date(start.getTime() + idx * DAY_MS);
          })();
      const dayEnd = new Date(day.getTime() + DAY_MS);
      const dayAssigns = await RotationAssignment.find({
        rotationId: id,
        date: { $gte: day, $lt: dayEnd },
      }).sort({ shiftType: 1 }).lean();
      if (dayAssigns.length === 0) throw ApiError.notFound('No assignments on that date');
      if (dayAssigns.length < 2) throw ApiError.badRequest('Need at least 2 assignments to rotate');

      const guardIds = (dayAssigns as any[]).map((a) => a.guardId.toString());
      const n = guardIds.length;
      const k = ((steps % n) + n) % n;
      const rotated = guardIds.map((_, i) => guardIds[((i - k) % n + n) % n]);

      // Two-phase apply: unique index is (rotationId, guardId, date), so a cyclic
      // permutation must not write final guardIds until all rows are free of old values.
      const phase = async (values: string[]) => {
        for (let i = 0; i < n; i++) {
          // eslint-disable-next-line no-await-in-loop
          await RotationAssignment.updateOne({ _id: (dayAssigns as any[])[i]._id }, { guardId: values[i] });
        }
      };
      const temps = (dayAssigns as any[]).map(() => new (require('mongoose').Types.ObjectId)().toString());
      await phase(temps);
      await phase(rotated);

      const violations = await this.validate(id, rot.generation?.days, undefined)
        .then((r) => r.conflicts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').map((c) => c.message))
        .catch(() => [] as string[]);

      if (violations.length > 0 && !data.override) {
        // roll back by rotating back (same two-phase constraint)
        const backTemps = (dayAssigns as any[]).map(() => new (require('mongoose').Types.ObjectId)().toString());
        await phase(backTemps);
        await phase(guardIds);
        const err = new ApiError(409, violations[0]) as any;
        err.violations = violations;
        throw err;
      }

      appendChange(rot, data.override ? 'ROTATE_OVERRIDE' : 'ROTATE', userId, `Rotated ${ymdLocal(day)} by ${steps}`);
      await rot.save();
      return { ok: true, date: day, violations };
    }

    // No day specified: rotate the pool order and regenerate
    const pool = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE')
      .sort((a: any, b: any) => a.order - b.order);
    if (pool.length < 2) throw ApiError.badRequest('Need at least 2 guards in the pool');
    const ids = pool.map((g: any) => g.guardId.toString());
    const k = ((steps % ids.length) + ids.length) % ids.length;
    const nextOrder = [...ids.slice(ids.length - k), ...ids.slice(0, ids.length - k)];
    await this.reorderPool(id, nextOrder, userId);
    const gen = await this.generate(id, rot.generation?.days, userId, undefined, undefined);
    appendChange(rot, 'ROTATE_POOL', userId, `Rotated pool order by ${steps}`);
    await rot.save();
    return { ok: true, regenerated: true, ...gen };
  }

  /** Re-run the engine with minimal disruption intent (full deterministic recompute). */
  static async recalculate(id: string, days?: number, userId?: string, _auditCtx?: { ip?: string; ua?: string }) {
    return this.generate(id, days, userId, _auditCtx);
  }

  // ── leave coverage (legacy) ─────────────────────────────────────────────

  static async suggestLeaveCoverA(id: string, guardId: string, date: Date) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    const dayAssigns = this.computeDayAssignments(rot, date);
    const workingIds = dayAssigns.map((a: any) => a.guardId.toString());
    const candidates = (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()) && g.guardId.toString() !== guardId)
      .map((g: any) => ({ guardId: g.guardId, reason: 'Pool guard not on duty this day' }));
    return candidates;
  }

  static async suggestLeaveCoverB(id: string, date: Date) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    const dayAssigns = this.computeDayAssignments(rot, date);
    const workingIds = dayAssigns.map((a: any) => a.guardId.toString());
    const candidates = (rot.floaterPool as any[])
      .filter((g: any) => g.status === 'ACTIVE' && !workingIds.includes(g.guardId.toString()))
      .map((g: any) => ({ guardId: g.guardId, reason: 'Floater available' }));
    return candidates;
  }

  static async applyLeaveCoverage(id: string, data: { guardId: string; startDate: string; endDate: string; path: string; coverGuardId: string }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    (rot.leaveCoverages as any[]).push({
      guardId: new mongoose.Types.ObjectId(data.guardId),
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      coverGuardId: new mongoose.Types.ObjectId(data.coverGuardId),
      path: data.path,
      appliedBy: new mongoose.Types.ObjectId(userId),
      appliedAt: new Date(),
    });
    if (rot.generation) rot.generation.stale = true;
    appendChange(rot, 'LEAVE_COVERAGE', userId, `Leave coverage for ${data.guardId}`);
    await rot.save();
    return rot;
  }

  static async isGuardInActiveRotation(guardId: string): Promise<string | null> {
    const activeRotation = await Rotation.findOne({
      status: { $in: ['ACTIVE', 'PUBLISHED'] },
      'guardPool.guardId': guardId,
      'guardPool.status': 'ACTIVE',
    });
    return activeRotation ? activeRotation._id.toString() : null;
  }

  static async cancelLeaveCoverage(id: string, guardId: string, startDate: Date, _userId: string) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    rot.leaveCoverages = (rot.leaveCoverages as any[]).filter(
      (lc: any) => lc.guardId.toString() !== guardId || lc.startDate.getTime() !== startDate.getTime()
    ) as any[];
    await rot.save();
    return rot;
  }
}
