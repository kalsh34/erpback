/**
 * Independent validator — re-checks a finished schedule from scratch.
 * Does NOT trust the scheduler: recomputes coverage, overlaps, leave and
 * timestamp-based rest from the raw cell list + external duties.
 */

import {
  Cell, ConflictIssue, DutyInterval, GuardCtx, LeaveWindow, RestRule, ShiftDef,
} from './types';
import { overlaps, hoursBetween, ymd, midnightOf, addDays, HOUR_MS } from './time';
import { minRestMsAfter } from './rest';

export interface ValidateInput {
  cells: Cell[];
  pool: GuardCtx[];
  shifts: ShiftDef[];
  restRules: RestRule[];
  startDate: Date;
  days: number;
  externalDuties: DutyInterval[];
  leaveWindows: LeaveWindow[];
  onLeaveGuards: string[];
}

export interface ValidationResult {
  ok: boolean;
  issues: string[];
  conflicts: ConflictIssue[];
}

interface Interval {
  start: Date;
  end: Date;
  source: string; // 'cell' | 'external'
  cell?: Cell;
  duty?: DutyInterval;
}

export function validateCells(input: ValidateInput, nameById: Map<string, string>): ValidationResult {
  const issues: string[] = [];
  const conflicts: ConflictIssue[] = [];
  const nameOf = (id: string) => nameById.get(id) || id;

  const poolIds = new Set(input.pool.map((g) => g.id));
  const shiftByKey = new Map(input.shifts.map((s) => [s.key, s]));
  const leaveSet = new Set(input.onLeaveGuards);

  // index cells by guard
  const byGuard = new Map<string, Cell[]>();
  for (const c of input.cells) {
    if (!byGuard.has(c.guardId)) byGuard.set(c.guardId, []);
    byGuard.get(c.guardId)!.push(c);
  }
  for (const arr of byGuard.values()) {
    arr.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  const extByGuard = new Map<string, DutyInterval[]>();
  for (const d of input.externalDuties) {
    if (!extByGuard.has(d.guardId)) extByGuard.set(d.guardId, []);
    extByGuard.get(d.guardId)!.push(d);
  }

  const leaveByGuard = new Map<string, LeaveWindow[]>();
  for (const w of input.leaveWindows) {
    if (!leaveByGuard.has(w.guardId)) leaveByGuard.set(w.guardId, []);
    leaveByGuard.get(w.guardId)!.push(w);
  }

  let seq = 0;
  const add = (c: Omit<ConflictIssue, 'id'>) => {
    conflicts.push({ id: `v${++seq}`, ...c });
  };

  // ── coverage per day per shift type ─────────────────────────────────────
  const startMid = midnightOf(input.startDate);
  for (let d = 0; d < input.days; d++) {
    const date = ymd(addDays(startMid, d));
    for (const shift of input.shifts) {
      if (shift.requiredCount <= 0) continue;
      const count = input.cells.filter((c) => c.date === date && c.shiftKey === shift.key).length;
      if (count < shift.requiredCount) {
        issues.push(`Day ${date}: ${shift.name} short by ${shift.requiredCount - count}`);
        add({
          severity: 'CRITICAL',
          code: 'COVERAGE_SHORTAGE',
          title: 'Coverage shortage',
          message: `On ${date} only ${count} of ${shift.requiredCount} required ${shift.name} positions are filled.`,
          date,
          dayIndex: d,
          shiftKey: shift.key,
          details: { required: shift.requiredCount, assigned: count },
          suggestions: ['Add guards to the pool', 'Reduce the daily requirement'],
        });
      }
    }
  }

  // ── per-cell checks ─────────────────────────────────────────────────────
  for (const cell of input.cells) {
    const gName = nameOf(cell.guardId);

    if (!poolIds.has(cell.guardId)) {
      issues.push(`${gName} on ${cell.date} is not in the pool`);
      add({
        severity: 'CRITICAL',
        code: 'INVALID_GUARD',
        title: 'Guard not in pool',
        message: `${gName} was assigned ${cell.shiftName} on ${cell.date} but is not in this rotation's guard pool.`,
        guardId: cell.guardId,
        guardName: gName,
        date: cell.date,
        dayIndex: cell.dayIndex,
        shiftKey: cell.shiftKey,
      });
      continue;
    }

    if (!shiftByKey.has(cell.shiftKey)) {
      issues.push(`Unknown shift key ${cell.shiftKey} on ${cell.date}`);
      add({
        severity: 'CRITICAL',
        code: 'CONFIG',
        title: 'Unknown shift',
        message: `${gName} was assigned an unknown shift type "${cell.shiftKey}" on ${cell.date}.`,
        guardId: cell.guardId,
        guardName: gName,
        date: cell.date,
        shiftKey: cell.shiftKey,
      });
      continue;
    }

    // leave
    if (leaveSet.has(cell.guardId)) {
      issues.push(`${gName} assigned while on leave on ${cell.date}`);
      add({
        severity: 'CRITICAL',
        code: 'ON_LEAVE',
        title: 'Assigned while on leave',
        message: `${gName} is on leave but was assigned ${cell.shiftName} starting ${cell.date}.`,
        guardId: cell.guardId,
        guardName: gName,
        date: cell.date,
        dayIndex: cell.dayIndex,
        shiftKey: cell.shiftKey,
        suggestions: ['Replace guard', 'Remove from pool while on leave'],
      });
    }
    for (const w of leaveByGuard.get(cell.guardId) || []) {
      if (overlaps(cell.startAt, cell.endAt, w.start, w.end)) {
        issues.push(`${gName} assigned during declared leave on ${cell.date}`);
        add({
          severity: 'CRITICAL',
          code: 'ON_LEAVE',
          title: 'Assigned during declared leave',
          message: `${gName} has declared leave covering ${cell.startAt.toLocaleString('en-GB')} but was assigned ${cell.shiftName}.`,
          guardId: cell.guardId,
          guardName: gName,
          date: cell.date,
          dayIndex: cell.dayIndex,
          shiftKey: cell.shiftKey,
        });
        break;
      }
    }

    // gather all intervals for this guard: cells + external
    const intervals: Interval[] = [];
    for (const c of byGuard.get(cell.guardId) || []) intervals.push({ start: c.startAt, end: c.endAt, source: 'cell', cell: c });
    for (const d of extByGuard.get(cell.guardId) || []) intervals.push({ start: d.start, end: d.end, source: 'external', duty: d });

    // overlap with any OTHER interval (not self)
    for (const iv of intervals) {
      const isSelf = iv.source === 'cell' && iv.cell === cell;
      if (isSelf) continue;
      if (overlaps(cell.startAt, cell.endAt, iv.start, iv.end)) {
        issues.push(`${gName} overlap on ${cell.date}`);
        add({
          severity: 'CRITICAL',
          code: 'OVERLAP',
          title: 'Overlapping assignment',
          message: `${gName} is already on duty ${iv.start.toLocaleString('en-GB')} – ${iv.end.toLocaleString('en-GB')} and cannot start ${cell.shiftName} at ${cell.startAt.toLocaleString('en-GB')}.`,
          guardId: cell.guardId,
          guardName: gName,
          date: cell.date,
          dayIndex: cell.dayIndex,
          shiftKey: cell.shiftKey,
          details: { otherStart: iv.start.toISOString(), otherEnd: iv.end.toISOString(), otherSource: iv.source },
          suggestions: ['Replace guard', 'Remove the conflicting assignment'],
        });
        break; // one overlap report per cell is enough
      }
    }

    // rest before: most recent interval ending at or before cell start
    let prev: Interval | null = null;
    for (const iv of intervals) {
      if (iv.source === 'cell' && iv.cell === cell) continue;
      if (iv.end.getTime() <= cell.startAt.getTime()) {
        if (!prev || iv.end.getTime() > prev.end.getTime()) prev = iv;
      }
    }
    if (prev) {
      const prevDur = hoursBetween(prev.start, prev.end);
      const needMs = minRestMsAfter(prevDur, input.restRules);
      const actualMs = cell.startAt.getTime() - prev.end.getTime();
      if (actualMs < needMs) {
        issues.push(`${gName} rest-before violation on ${cell.date}`);
        add({
          severity: 'REST',
          code: 'REST_VIOLATION',
          title: 'Required recovery time could not be maintained',
          message:
            `${gName} has only ${Math.round(actualMs / HOUR_MS)}h recovery before this shift ` +
            `(needs ${Math.round(needMs / HOUR_MS)}h after the previous shift ended ${prev.end.toLocaleString('en-GB')}).`,
          guardId: cell.guardId,
          guardName: gName,
          date: cell.date,
          dayIndex: cell.dayIndex,
          shiftKey: cell.shiftKey,
          details: {
            requiredHours: Math.round(needMs / HOUR_MS),
            actualHours: Math.round(actualMs / HOUR_MS),
            differenceHours: Math.round((actualMs - needMs) / HOUR_MS),
            previousEnd: prev.end.toISOString(),
            assignedStart: cell.startAt.toISOString(),
          },
          suggestions: ['Replace guard', 'Add guard to pool'],
        });
      }
    }

    // rest after: earliest interval starting at or after cell end
    let next: Interval | null = null;
    for (const iv of intervals) {
      if (iv.source === 'cell' && iv.cell === cell) continue;
      if (iv.start.getTime() >= cell.endAt.getTime()) {
        if (!next || iv.start.getTime() < next.start.getTime()) next = iv;
      }
    }
    if (next) {
      const needMs = minRestMsAfter(hoursBetween(cell.startAt, cell.endAt), input.restRules);
      const actualMs = next.start.getTime() - cell.endAt.getTime();
      if (actualMs < needMs) {
        issues.push(`${gName} rest-after violation on ${cell.date}`);
        add({
          severity: 'REST',
          code: 'REST_VIOLATION',
          title: 'Required recovery time could not be maintained',
          message:
            `${gName} would only get ${Math.round(actualMs / HOUR_MS)}h recovery after this shift ` +
            `before the next duty starting ${next.start.toLocaleString('en-GB')} (needs ${Math.round(needMs / HOUR_MS)}h).`,
          guardId: cell.guardId,
          guardName: gName,
          date: cell.date,
          dayIndex: cell.dayIndex,
          shiftKey: cell.shiftKey,
          details: {
            requiredHours: Math.round(needMs / HOUR_MS),
            actualHours: Math.round(actualMs / HOUR_MS),
            differenceHours: Math.round((actualMs - needMs) / HOUR_MS),
            assignedEnd: cell.endAt.toISOString(),
            nextStart: next.start.toISOString(),
          },
          suggestions: ['Replace guard', 'Add guard to pool'],
        });
      }
    }
  }

  return { ok: conflicts.length === 0, issues, conflicts };
}
