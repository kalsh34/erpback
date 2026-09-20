import mongoose from 'mongoose';
import { Rotation, IRotation } from '../../../models/Rotation';
import { RotationAssignment } from '../../../models/RotationAssignment';
import { ShiftAssignment } from '../../../models/ShiftAssignment';
import { Site } from '../../../models/Site';
import { Employee } from '../../../models/Employee';
import { ApiError } from '../../../common/ApiError';
import { eventBus } from '../../../core/events/EventBus';
import { shiftsTimeOverlap } from '../shifts/conflict-check';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export class RotationService {
  static getShiftLabel(rot: IRotation, shiftType: 'DAY' | 'NIGHT'): string {
    if (shiftType === 'DAY') {
      const start = rot.dayStartTime || '06:00';
      const end = rot.dayEndTime || rot.nightEndTime || '18:00';
      return `${start}-${end}`;
    }

    const start = rot.nightStartTime || rot.nightEndTime || '18:00';
    const end = rot.nightEndTime || '06:00';
    return `${start}-${end}`;
  }

  static getActivePool(rot: IRotation) {
    return (rot.guardPool as any[])
      .filter((g: any) => g.status === 'ACTIVE')
      .sort((a: any, b: any) => {
        const aId = (a.guardId?.toString() || '');
        const bId = (b.guardId?.toString() || '');
        if (aId === bId) return 0;
        return aId.localeCompare(bId);
      });
  }

  static parseHM(value: string | undefined | null, fallback: string): { h: number; m: number } {
    const src = value && value.includes(':') ? value : fallback;
    const parts = src.split(':');
    return { h: parseInt(parts[0], 10) || 0, m: parseInt(parts[1], 10) || 0 };
  }

  static atTime(date: Date, h: number, m: number): Date {
    const d = new Date(date.getTime());
    d.setHours(h, m, 0, 0);
    return d;
  }

  /** Actual start/end Date of a shift slot on a given calendar day (night shifts cross midnight). */
  static getSlotWindow(rot: IRotation, date: Date, shiftType: 'DAY' | 'NIGHT'): { start: Date; end: Date } {
    if (shiftType === 'DAY') {
      const s = this.parseHM(rot.dayStartTime, '06:00');
      const e = this.parseHM(rot.dayEndTime, '18:00');
      const start = this.atTime(date, s.h, s.m);
      let end = this.atTime(date, e.h, e.m);
      if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
      return { start, end };
    }
    const s = this.parseHM(rot.nightStartTime, '18:00');
    const e = this.parseHM(rot.nightEndTime, '06:00');
    const start = this.atTime(date, s.h, s.m);
    let end = this.atTime(date, e.h, e.m);
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + 86400000);
    return { start, end };
  }

  static fmtHM(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  static fmtDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** Pick the best slot candidate: most rest first, then fewest shifts, then pool order, then id. */
  private static isBetterRestCandidate(
    a: { id: string; rest: number; shifts: number; order: number },
    b: { id: string; rest: number; shifts: number; order: number }
  ): boolean {
    const INF = Number.MAX_SAFE_INTEGER;
    const ar = a.rest === Number.POSITIVE_INFINITY ? INF : a.rest;
    const br = b.rest === Number.POSITIVE_INFINITY ? INF : b.rest;
    if (ar !== br) return ar > br;
    if (a.shifts !== b.shifts) return a.shifts < b.shifts;
    if (a.order !== b.order) return a.order < b.order;
    return a.id < b.id;
  }

  /**
   * Fair-rest scheduling ("most-rested guard first").
   *
   * Rules:
   * - Slots are filled day by day: all DAY slots, then all NIGHT slots.
   * - A guard is eligible for a slot only if the rest since their previous
   *   shift ended is >= the required rest:
   *     12h shift  → 12h rest minimum
   *     24h shift  → 48h rest minimum
   *   If no guard qualifies (pool too small), the most-rested guard is used
   *   anyway so the post is never left uncovered, and a warning is recorded.
   * - Cross-site conflicts: if a guard has an existing shift assignment at
   *   another site that overlaps the candidate slot, they are excluded.
   * - Among eligible guards the one with the MOST rest wins (ties broken by
   *   fewest total shifts, then pool order).
   *
   * @param existingByGuard  optional map of guardId → array of time ranges
   *                         { start: Date, end: Date } representing known
   *                         assignments at OTHER sites (cross-site conflicts).
   */
  static buildRestAwareSchedule(
    rot: IRotation,
    fromDate: Date,
    days: number,
    existingByGuard?: Map<string, { start: Date; end: Date }[]>,
  ): {
    assignments: { date: Date; guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; startTime: string; endTime: string; shiftTime: string }[];
    warnings: string[];
  } {
    const activeGuards = this.getActivePool(rot);
    const empty: { assignments: any[]; warnings: string[] } = { assignments: [], warnings: [] };
    if (activeGuards.length === 0) return empty;

    const singleMode = rot.shiftMode === 'SINGLE_24H';
    const dayCount = singleMode ? Math.max(1, rot.dayShiftCount) : Math.max(0, rot.dayShiftCount);
    const nightCount = singleMode ? 0 : Math.max(0, rot.nightShiftCount);
    if (dayCount + nightCount <= 0) return empty;

    const state = new Map<string, { lastEnd: Date | null; shifts: number; order: number; guardId: mongoose.Types.ObjectId }>();
    activeGuards.forEach((g: any, i: number) => {
      state.set(g.guardId.toString(), { lastEnd: null, shifts: 0, order: i, guardId: g.guardId });
    });

    const fromDay = new Date(fromDate.getTime());
    fromDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(fromDay.getTime() + Math.max(0, days - 1) * 86400000);

    const rotStart = new Date(rot.startDate);
    rotStart.setHours(0, 0, 0, 0);
    const MAX_SIM_DAYS = 400;
    let anchor = new Date(Math.min(rotStart.getTime(), fromDay.getTime()));
    const earliest = fromDay.getTime() - MAX_SIM_DAYS * 86400000;
    if (anchor.getTime() < earliest) anchor = new Date(earliest);
    anchor.setHours(0, 0, 0, 0);

    const warnings: string[] = [];
    const result: { date: Date; guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; startTime: string; endTime: string; shiftTime: string }[] = [];

    for (let cursor = new Date(anchor); cursor.getTime() <= lastDay.getTime(); cursor.setDate(cursor.getDate() + 1)) {
      const date = new Date(cursor.getTime());
      const inRange = date.getTime() >= fromDay.getTime();

      const slots: ('DAY' | 'NIGHT')[] = [];
      for (let i = 0; i < dayCount; i += 1) slots.push('DAY');
      for (let i = 0; i < nightCount; i += 1) slots.push('NIGHT');

      for (const shiftType of slots) {
        const window = this.getSlotWindow(rot, date, shiftType);
        const shiftDuration = window.end.getTime() - window.start.getTime();
        const requiredRest = singleMode ? shiftDuration * 2 : shiftDuration;

        let best: { id: string; rest: number; shifts: number; order: number } | null = null;
        let fallback: { id: string; rest: number; shifts: number; order: number } | null = null;

        for (const [id, st] of state) {
          const rest = st.lastEnd ? window.start.getTime() - st.lastEnd.getTime() : Number.POSITIVE_INFINITY;

          let crossSiteConflict = false;
          if (existingByGuard) {
            const existingSlots = existingByGuard.get(id) || [];
            for (const es of existingSlots) {
              if (window.start < es.end && es.start < window.end) {
                crossSiteConflict = true;
                break;
              }
            }
          }

          if (crossSiteConflict) continue;

          const cand = { id, rest, shifts: st.shifts, order: st.order };
          if (rest >= requiredRest && (!best || this.isBetterRestCandidate(cand, best))) best = cand;
          if (!fallback || this.isBetterRestCandidate(cand, fallback)) fallback = cand;
        }

        const chosen = best || fallback;
        if (!chosen) continue;
        const st = state.get(chosen.id)!;
        st.lastEnd = window.end;
        st.shifts += 1;

        if (!best) {
          warnings.push(`${shiftType} slot on ${this.fmtDay(date)}: no guard had the required ${Math.round(requiredRest / 3600000)}h rest — assigned the most-rested guard to keep the post covered.`);
        }

        if (inRange) {
          const startTime = this.fmtHM(window.start);
          const endTime = this.fmtHM(window.end);
          result.push({
            date: new Date(date.getTime()),
            guardId: st.guardId,
            shiftType,
            startTime,
            endTime,
            shiftTime: `${startTime}-${endTime}`,
          });
        }
      }
    }

    return { assignments: result, warnings };
  }

  static computeDayAssignments(rot: IRotation, date: Date): { guardId: mongoose.Types.ObjectId; shiftType: 'DAY' | 'NIGHT'; shiftTime: string }[] {
    const activeGuards = this.getActivePool(rot);
    if (activeGuards.length === 0) return [];
    const day = new Date(date.getTime());
    day.setHours(0, 0, 0, 0);
    const { assignments } = this.buildRestAwareSchedule(rot, day, 1);
    return assignments.map((a) => ({ guardId: a.guardId, shiftType: a.shiftType, shiftTime: a.shiftTime }));
  }

  static async create(data: {
    name: string;
    description?: string;
    siteId: string;
    shiftMode?: 'STANDARD_12H' | 'SINGLE_24H';
    dayShiftCount: number;
    nightShiftCount: number;
    dayStartTime?: string;
    dayEndTime?: string;
    nightStartTime?: string;
    nightEndTime?: string;
    startDate: string;
  }, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const site = await Site.findById(data.siteId);
    if (!site) throw ApiError.notFound('Site not found');

    const shiftMode = data.shiftMode || 'STANDARD_12H';
    const dayShiftCount = Number(data.dayShiftCount ?? 0);
    const nightShiftCount = Number(data.nightShiftCount ?? 0);

    if (dayShiftCount < 0 || nightShiftCount < 0) {
      throw ApiError.badRequest('Shift counts cannot be negative');
    }

    if (shiftMode === 'SINGLE_24H') {
      if (dayShiftCount < 1) throw ApiError.badRequest('Single-shift rotations need at least 1 guard on duty');
    }

    const finalDayCount = shiftMode === 'SINGLE_24H' ? Math.max(1, dayShiftCount) : dayShiftCount;
    const finalNightCount = shiftMode === 'SINGLE_24H' ? 0 : nightShiftCount;
    if (finalDayCount + finalNightCount <= 0) throw ApiError.badRequest('At least one guard must be scheduled per day');

    const rotation = await Rotation.create({
      name: data.name,
      description: data.description,
      siteId: data.siteId,
      shiftMode,
      dayShiftCount: finalDayCount,
      nightShiftCount: finalNightCount,
      dayStartTime: data.dayStartTime || '06:00',
      dayEndTime: data.dayEndTime || '18:00',
      nightStartTime: data.nightStartTime || '18:00',
      nightEndTime: data.nightEndTime || '06:00',
      startDate: new Date(data.startDate),
      status: 'DRAFT',
      guardPool: [],
      floaterPool: [],
      leaveCoverages: [],
      createdBy: userId,
    });

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
    if (rotation.status !== 'DRAFT') throw ApiError.badRequest('Can only edit DRAFT rotations');

    const allowed = ['name', 'description', 'shiftMode', 'dayShiftCount', 'nightShiftCount', 'dayStartTime', 'dayEndTime', 'nightStartTime', 'nightEndTime', 'startDate'];
    const nextMode = data.shiftMode ?? rotation.shiftMode ?? 'STANDARD_12H';
    const nextDay = Number(data.dayShiftCount ?? rotation.dayShiftCount ?? 0);
    let nextNight = Number(data.nightShiftCount ?? rotation.nightShiftCount ?? 0);

    if (nextMode === 'SINGLE_24H') {
      if (nextDay < 1) throw ApiError.badRequest('Single-shift rotations need at least 1 guard on duty');
      nextNight = 0;
    }
    if (nextDay < 0 || nextNight < 0) throw ApiError.badRequest('Shift counts cannot be negative');
    if (nextDay + nextNight <= 0) throw ApiError.badRequest('At least one guard must be scheduled per day');

    rotation.shiftMode = nextMode;
    rotation.dayShiftCount = nextDay;
    rotation.nightShiftCount = nextNight;
    rotation.dayStartTime = data.dayStartTime ?? rotation.dayStartTime ?? '06:00';
    rotation.dayEndTime = data.dayEndTime ?? rotation.dayEndTime ?? '18:00';
    rotation.nightStartTime = data.nightStartTime ?? rotation.nightStartTime ?? '18:00';
    rotation.nightEndTime = data.nightEndTime ?? rotation.nightEndTime ?? '18:00';
    if (data.startDate) rotation.startDate = new Date(data.startDate);
    if (data.name !== undefined) rotation.name = data.name;
    if (data.description !== undefined) rotation.description = data.description;

    await rotation.save();
    return rotation;
  }

  static async delete(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    await RotationAssignment.deleteMany({ rotationId: id });
    await Rotation.findByIdAndDelete(id);
    eventBus.emit('hr.rotation.deleted', { rotationId: id });
  }

  static async addGuards(id: string, guardIds: string[], _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');

    for (const gid of guardIds) {
      const exists = (rotation.guardPool as any[]).find((g: any) => g.guardId.toString() === gid);
      if (!exists) {
        (rotation.guardPool as any[]).push({
          guardId: new mongoose.Types.ObjectId(gid),
          status: 'ACTIVE',
          order: (rotation.guardPool as any[]).length,
        });
      }
    }
    await rotation.save();
    return rotation;
  }

  static async removeGuard(id: string, guardId: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');
    rotation.guardPool = (rotation.guardPool as any[]).filter((g: any) => g.guardId.toString() !== guardId) as any[];
    (rotation.guardPool as any[]).forEach((g: any, i: number) => { g.order = i; });
    await rotation.save();
    return rotation;
  }

  static async reorderPool(id: string, orderedGuardIds: string[], _userId: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');

    const poolMap = new Map((rotation.guardPool as any[]).map((g: any) => [g.guardId.toString(), g]));
    rotation.guardPool = orderedGuardIds.map((gid: string, i: number) => {
      const existing = poolMap.get(gid);
      return { guardId: new mongoose.Types.ObjectId(gid), status: existing?.status || 'ACTIVE', order: i };
    }) as any[];
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
    const workDaysPerCycle = (cycleDays * slotCountPerDay) / poolSize;
    return {
      isFair: true,
      cycleDays,
      workDaysPerCycle,
      dutyPercent: Math.round((slotCountPerDay / poolSize) * 100),
    };
  }

  static async preview(id: string, days: number) {
    const rot = await Rotation.findById(id).populate('siteId', 'siteName siteCode');
    if (!rot) throw ApiError.notFound('Rotation not found');

    const activeGuards = this.getActivePool(rot);
    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(rot.dayShiftCount, 1) : rot.dayShiftCount + rot.nightShiftCount;

    if (poolSize === 0) throw ApiError.badRequest('No active guards in pool');
    if (slotCountPerDay <= 0) throw ApiError.badRequest('At least one shift duty must be assigned');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch cross-site ShiftAssignments so the scheduler avoids conflicts
    const poolObjectIds = activeGuards.map((g: any) => g.guardId);
    const allExisting = await ShiftAssignment.find({
      guardId: { $in: poolObjectIds },
      status: 'ACTIVE',
    }).populate('shiftTemplateId', 'startTime endTime');

    const crossSiteMap = new Map<string, { start: Date; end: Date }[]>();
    for (const a of allExisting) {
      const gid = (a.guardId as any).toString();
      if (!crossSiteMap.has(gid)) crossSiteMap.set(gid, []);
      const template = a.shiftTemplateId as any;
      if (!template) continue;
      const dayStart = new Date(a.startDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = a.endDate && a.endDate.getTime() > 0 ? new Date(a.endDate) : new Date(dayStart.getTime() + 86400000);
      const [sh, sm] = (template.startTime || '06:00').split(':').map(Number);
      const [eh, em] = (template.endTime || '18:00').split(':').map(Number);
      const sMs = dayStart.getTime() + (sh * 60 + (sm || 0)) * 60000;
      let eMs = dayStart.getTime() + (eh * 60 + (em || 0)) * 60000;
      if (eMs <= sMs) eMs += 86400000;
      crossSiteMap.get(gid)!.push({ start: new Date(sMs), end: new Date(eMs) });
    }

    const { assignments, warnings } = this.buildRestAwareSchedule(rot, today, days, crossSiteMap);

    // Resolve guard details so the frontend grid can show real names
    const employees = await Employee.find({ _id: { $in: poolObjectIds } }).select('firstName lastName employeeCode');
    const empMap = new Map<string, any>(employees.map((e: any) => [e._id.toString(), e]));

    const enriched = assignments.map((a) => {
      const emp = empMap.get(a.guardId.toString());
      return {
        ...a,
        guard: emp
          ? { _id: emp._id, firstName: emp.firstName, lastName: emp.lastName, employeeCode: emp.employeeCode }
          : null,
      };
    });

    // Per-guard workload / rest stats for the preview period
    const guardStats = activeGuards.map((g: any) => {
      const id = g.guardId.toString();
      const emp = empMap.get(id);
      const mine = assignments.filter((a) => a.guardId.toString() === id);
      return {
        guardId: id,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        employeeCode: emp?.employeeCode || '',
        dayShifts: mine.filter((a) => a.shiftType === 'DAY').length,
        nightShifts: mine.filter((a) => a.shiftType === 'NIGHT').length,
        totalShifts: mine.length,
        restDays: Math.max(0, days - mine.length),
      };
    });

    return {
      assignments: enriched,
      shiftTimes: { day: this.getShiftLabel(rot, 'DAY'), night: this.getShiftLabel(rot, 'NIGHT') },
      siteName: (rot.siteId as any)?.siteName || '',
      poolSize,
      slotCountPerDay,
      cycleDays: poolSize / gcd(poolSize, slotCountPerDay),
      warnings,
      guardStats,
    };
  }

  static async generate(id: string, days: number, userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');

    const activeGuards = this.getActivePool(rot);
    const poolSize = activeGuards.length;
    const slotCountPerDay = rot.shiftMode === 'SINGLE_24H' ? Math.max(rot.dayShiftCount, 1) : rot.dayShiftCount + rot.nightShiftCount;

    if (poolSize === 0) throw ApiError.badRequest('No active guards in pool');
    if (slotCountPerDay <= 0) throw ApiError.badRequest('At least one shift duty must be assigned');

    await RotationAssignment.deleteMany({ rotationId: id });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const guardIds = activeGuards.map((g: any) => g.guardId.toString());
    const allExistingAssignments = await ShiftAssignment.find({
      guardId: { $in: guardIds },
      status: 'ACTIVE',
    }).populate('shiftTemplateId', 'startTime endTime');

    const crossSiteMap = new Map<string, { start: Date; end: Date }[]>();
    for (const a of allExistingAssignments) {
      const gid = (a.guardId as any).toString();
      if (!crossSiteMap.has(gid)) crossSiteMap.set(gid, []);
      const template = a.shiftTemplateId as any;
      if (!template) continue;
      const dayStart = new Date(a.startDate); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = a.endDate && a.endDate.getTime() > 0 ? new Date(a.endDate) : new Date(dayStart.getTime() + 86400000);
      const [sh, sm] = (template.startTime || '06:00').split(':').map(Number);
      const [eh, em] = (template.endTime || '18:00').split(':').map(Number);
      const sMs = dayStart.getTime() + (sh * 60 + (sm || 0)) * 60000;
      let eMs = dayStart.getTime() + (eh * 60 + (em || 0)) * 60000;
      if (eMs <= sMs) eMs += 86400000;
      crossSiteMap.get(gid)!.push({ start: new Date(sMs), end: new Date(eMs) });
    }

    const { assignments: schedAssignments, warnings } = this.buildRestAwareSchedule(rot, today, days, crossSiteMap);

    const skipped: { guardId: string; date: string; shiftType: string; reason: string }[] = warnings.map((w) => ({
      guardId: '', date: '', shiftType: '', reason: w,
    }));

    const toSave = schedAssignments.map((a) => ({
      rotationId: rot._id,
      guardId: a.guardId,
      siteId: rot.siteId,
      date: a.date,
      shiftType: a.shiftType,
      shiftTime: a.shiftTime,
      assignedBy: userId,
    }));

    const created = toSave.length > 0 ? await RotationAssignment.insertMany(toSave) : [];
    rot.lastGeneratedDate = new Date();
    await rot.save();

    eventBus.emit('hr.rotation.generated', { rotationId: id, count: created.length, days, skippedCount: skipped.length });
    return { count: created.length, days, skipped, total: created.length + skipped.length, warnings };
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

  static async rotateAssignments(id: string, date: string) {
    const rotation = await Rotation.findById(id);
    if (!rotation) throw ApiError.notFound('Rotation not found');

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const assignments = await RotationAssignment.find({ rotationId: id, date: targetDate }).sort({ shiftType: 1, createdAt: 1 });
    if (!assignments.length) return [];

    const dayAssignments = assignments.filter((a: any) => a.shiftType === 'DAY');
    const nightAssignments = assignments.filter((a: any) => a.shiftType === 'NIGHT');
    const swapCount = Math.min(dayAssignments.length, nightAssignments.length);

    for (let i = 0; i < swapCount; i += 1) {
      const dayAssignment = dayAssignments[i];
      const nightAssignment = nightAssignments[i];
      const dayGuard = dayAssignment.guardId;
      const nightGuard = nightAssignment.guardId;
      if (dayGuard && nightGuard) {
        dayAssignment.guardId = nightGuard;
        dayAssignment.shiftTime = this.getShiftLabel(rotation, 'DAY');
        nightAssignment.guardId = dayGuard;
        nightAssignment.shiftTime = this.getShiftLabel(rotation, 'NIGHT');
        await dayAssignment.save();
        await nightAssignment.save();
      }
    }

    return RotationAssignment.find({ rotationId: id, date: targetDate }).populate('guardId', 'firstName lastName employeeCode').sort({ shiftType: 1 });
  }

  static async activate(id: string, _userId: string, _auditCtx?: { ip?: string; ua?: string }) {
    const rot = await Rotation.findById(id);
    if (!rot) throw ApiError.notFound('Rotation not found');
    if (rot.status === 'ACTIVE') throw ApiError.badRequest('Already active');
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
    await rot.save();
    return rot;
  }

  static async isGuardInActiveRotation(guardId: string): Promise<string | null> {
    const activeRotation = await Rotation.findOne({
      status: 'ACTIVE',
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
