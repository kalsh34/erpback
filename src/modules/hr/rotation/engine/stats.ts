/**
 * Statistics for preview and dashboard: coverage %, rest compliance,
 * fairness index, staffing estimate, per-guard workload.
 */

import {
  Cell, ConflictIssue, CoverageShiftStat, DutyInterval, GuardCtx, GuardWorkload,
  RestRule, ShiftDef, StatsReport,
} from './types';
import { hoursBetween, ymd, midnightOf, addDays, HOUR_MS } from './time';
import { minRestMsAfter } from './rest';

export interface StatsInput {
  cells: Cell[];
  pool: GuardCtx[];
  shifts: ShiftDef[];
  restRules: RestRule[];
  startDate: Date;
  days: number;
  externalDuties: DutyInterval[];
  nameById: Map<string, string>;
  unplaced: Record<string, number>;
}

function isNightKey(key: string): boolean {
  return key.toUpperCase().includes('NIGHT');
}

function crossesMidnight(c: Cell): boolean {
  return Math.floor(c.startAt.getTime() / 86400000) !== Math.floor(c.endAt.getTime() / 86400000);
}

export function buildStats(input: StatsInput): StatsReport {
  const { cells, pool, shifts, restRules, days, nameById } = input;
  const startMid = midnightOf(input.startDate);
  const shiftByKey = new Map(shifts.map((s) => [s.key, s]));

  // ── coverage ────────────────────────────────────────────────────────────
  const byShift: CoverageShiftStat[] = [];
  let totalRequiredSlots = 0;
  let totalAssignedSlots = 0;
  let shortageDayCount = 0;

  for (const shift of shifts) {
    if (shift.requiredCount <= 0) continue;
    const requiredTotal = shift.requiredCount * days;
    let assignedTotal = 0;
    let shortageDays = 0;
    let assignedSum = 0;
    for (let d = 0; d < days; d++) {
      const date = ymd(addDays(startMid, d));
      const count = cells.filter((c) => c.date === date && c.shiftKey === shift.key).length;
      assignedTotal += count;
      assignedSum += count;
      if (count < shift.requiredCount) {
        shortageDays += 1;
        shortageDayCount += 1;
      }
    }
    totalRequiredSlots += requiredTotal;
    totalAssignedSlots += assignedTotal;
    byShift.push({
      key: shift.key,
      name: shift.name,
      requiredPerDay: shift.requiredCount,
      assignedPerDayAvg: days > 0 ? assignedSum / days : 0,
      pct: requiredTotal > 0 ? Math.min(100, Math.round((assignedTotal / requiredTotal) * 1000) / 10) : 100,
      shortageDays,
    });
  }

  const overallPct = totalRequiredSlots > 0
    ? Math.min(100, Math.round((totalAssignedSlots / totalRequiredSlots) * 1000) / 10)
    : 100;

  // ── rest compliance (timestamp-based, cells + external duties) ─────────
  const intervalsByGuard = new Map<string, { start: Date; end: Date; cell?: Cell }[]>();
  const push = (guardId: string, iv: { start: Date; end: Date; cell?: Cell }) => {
    if (!intervalsByGuard.has(guardId)) intervalsByGuard.set(guardId, []);
    intervalsByGuard.get(guardId)!.push(iv);
  };
  for (const c of cells) push(c.guardId, { start: c.startAt, end: c.endAt, cell: c });
  for (const d of input.externalDuties) push(d.guardId, { start: d.start, end: d.end });

  let dutyIntervals = 0;
  let compliantIntervals = 0;
  const violations: StatsReport['rest']['violations'] = [];

  for (const arr of intervalsByGuard.values()) {
    arr.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 0; i < arr.length; i++) {
      dutyIntervals += 1;
      const cur = arr[i];
      let ok = true;
      // rest after previous
      if (i > 0) {
        const prev = arr[i - 1];
        // only meaningful if prev ended before cur started (no overlap)
        if (prev.end.getTime() <= cur.start.getTime()) {
          const needMs = minRestMsAfter(hoursBetween(prev.start, prev.end), restRules);
          const actualMs = cur.start.getTime() - prev.end.getTime();
          if (actualMs < needMs) {
            ok = false;
            if (cur.cell) {
              violations.push({
                guardId: cur.cell.guardId,
                guardName: nameById.get(cur.cell.guardId) || cur.cell.guardId,
                date: cur.cell.date,
                shiftKey: cur.cell.shiftKey,
                requiredHours: Math.round(needMs / HOUR_MS),
                actualHours: Math.round(actualMs / HOUR_MS),
                previousEnd: prev.end.toISOString(),
                assignedStart: cur.start.toISOString(),
              });
            }
          }
        }
      }
      if (ok) compliantIntervals += 1;
    }
  }

  const compliancePct = dutyIntervals > 0
    ? Math.round((compliantIntervals / dutyIntervals) * 1000) / 10
    : 100;

  // ── workloads ───────────────────────────────────────────────────────────
  const workloads: GuardWorkload[] = [];
  const allDates = new Set<string>();
  for (let d = 0; d < days; d++) allDates.add(ymd(addDays(startMid, d)));

  for (const g of pool) {
    const mine = cells.filter((c) => c.guardId === g.id);
    let hours = 0;
    const byShiftCounts: Record<string, number> = {};
    const workedDates = new Set<string>();
    let dayShifts = 0;
    let nightShifts = 0;
    let maxConsecutive = 0;

    const sorted = [...mine].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    for (const c of sorted) {
      hours += hoursBetween(c.startAt, c.endAt);
      byShiftCounts[c.shiftKey] = (byShiftCounts[c.shiftKey] || 0) + 1;
      workedDates.add(c.date);
      if (isNightKey(c.shiftKey) || crossesMidnight(c)) nightShifts += 1;
      else dayShifts += 1;
    }

    // consecutive worked days
    const dateArr = [...workedDates].sort();
    let run = 0;
    let prevDate: string | null = null;
    const dates = [...allDates].sort();
    for (const dt of dates) {
      if (workedDates.has(dt)) {
        run += 1;
        if (run > maxConsecutive) maxConsecutive = run;
      } else {
        run = 0;
      }
      prevDate = dt;
    }
    void prevDate;
    void dateArr;

    // rest gaps between this guard's duties
    let longestRest: number | null = null;
    let shortestRest: number | null = null;
    const ivs = intervalsByGuard.get(g.id) || [];
    const sortedIvs = [...ivs].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sortedIvs.length; i++) {
      const gapH = hoursBetween(sortedIvs[i - 1].end, sortedIvs[i].start);
      if (gapH < 0) continue;
      if (longestRest === null || gapH > longestRest) longestRest = gapH;
      if (shortestRest === null || gapH < shortestRest) shortestRest = gapH;
    }

    const restDays = [...allDates].filter((dt) => !workedDates.has(dt)).length;

    workloads.push({
      guardId: g.id,
      name: g.name,
      code: (g as any).code || '',
      hours: Math.round(hours * 10) / 10,
      shifts: mine.length,
      restDays,
      byShift: byShiftCounts,
      dayShifts,
      nightShifts,
      longestRestHours: longestRest !== null ? Math.round(longestRest) : null,
      shortestRestHours: shortestRest !== null ? Math.round(shortestRest) : null,
      maxConsecutive,
    });
  }

  // ── fairness ────────────────────────────────────────────────────────────
  const hourVals = workloads.map((w) => w.hours);
  const nightVals = workloads.map((w) => w.nightShifts);
  const avgHours = hourVals.length > 0 ? hourVals.reduce((a, b) => a + b, 0) / hourVals.length : 0;
  const maxH = hourVals.length > 0 ? Math.max(...hourVals) : 0;
  const minH = hourVals.length > 0 ? Math.min(...hourVals) : 0;
  const maxN = nightVals.length > 0 ? Math.max(...nightVals) : 0;
  const minN = nightVals.length > 0 ? Math.min(...nightVals) : 0;
  const hourSpread = Math.round((maxH - minH) * 10) / 10;
  const nightSpread = maxN - minN;
  // 100 = perfectly equal hours and night burden
  const hourScore = avgHours > 0 ? Math.max(0, 1 - hourSpread / Math.max(avgHours, 1)) : 1;
  const nightScore = avgHours > 0 ? Math.max(0, 1 - nightSpread / Math.max(1, Math.max(...nightVals, 1))) : 1;
  const index = Math.round((hourScore * 0.7 + nightScore * 0.3) * 1000) / 10;

  // ── staffing estimate ───────────────────────────────────────────────────
  // guards needed so every duty can be followed by its required rest:
  //   per shift type: required × ceil((duration + restAfter) / 24)
  let estimatedMinPool = 0;
  for (const shift of shifts) {
    if (shift.requiredCount <= 0) continue;
    const restH = minRestMsAfter(shift.durationHours, restRules) / HOUR_MS;
    const cycle = shift.durationHours + restH;
    estimatedMinPool += shift.requiredCount * Math.ceil(cycle / 24);
  }
  const requiredPerDay = shifts.reduce((s, x) => s + x.requiredCount, 0);
  estimatedMinPool = Math.max(estimatedMinPool, requiredPerDay, 1);

  const currentPool = pool.length;
  const recommendedAdditional = Math.max(0, estimatedMinPool - currentPool);

  return {
    days,
    poolSize: currentPool,
    totalSlotsPerDay: requiredPerDay,
    totalAssignments: cells.length,
    totalHours: Math.round(workloads.reduce((s, w) => s + w.hours, 0) * 10) / 10,
    coverage: {
      overallPct,
      byShift,
      shortageDayCount,
    },
    rest: {
      dutyIntervals,
      compliantIntervals,
      compliancePct,
      violations,
    },
    fairness: {
      index,
      hourSpread,
      nightSpread,
      avgHours: Math.round(avgHours * 10) / 10,
    },
    staffing: {
      estimatedMinPool,
      currentPool,
      recommendedAdditional,
      sufficient: recommendedAdditional === 0,
    },
    workloads: workloads.sort((a, b) => a.name.localeCompare(b.name)),
  };
}
