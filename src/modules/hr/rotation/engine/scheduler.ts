/**
 * Constraint-based scheduler with fairness optimization.
 *
 * Priority hierarchy (PHASE 38):
 *   1 valid data -> 2 coverage -> 3 availability -> 4 no overlap ->
 *   5 required rest (hard) -> 6 fair workload -> 7 fair day/night ->
 *   8 minimize consecutive work -> 9 preferences
 *
 * Strategy (PHASE 14):
 *   STAGE 1  validate configuration
 *   STAGE 2  build the base sequence (coverage by construction)
 *   STAGE 3  seed every day from baseSequence[(d - i) mod N]
 *   STAGE 4  build guard state from previous/external duties + leave
 *   STAGE 5  constraint-repair pass (reassign / mutual swap; else controlled conflict)
 *   STAGE 6  fairness passes (only when repairs disturbed the equal-cycle pattern)
 *   STAGE 7  independent validation (validator.ts)
 *   STAGE 8  statistics
 *   STAGE 9  conflict assembly -> preview
 *
 * Deterministic: no randomness; ties broken by guard id.
 * Never silently violates rest: unfixable cases become explicit conflicts and
 * the schedule is labelled BEST_POSSIBLE instead of FULLY_COMPLIANT.
 */

import {
  Cell, ConflictIssue, EngineConfigError, EngineInput, Feasibility,
  GenerationReport, GuardCtx, ShiftDef, ALGORITHM_VERSION,
} from './types';
import { resolveShift, shiftInterval, overlaps, hoursBetween, ymd, midnightOf, addDays, HOUR_MS, DAY_MS } from './time';
import { minRestMsAfter, normalizeRestRules, rulesFingerprint } from './rest';
import { buildBaseSequenceFromSlots, slotFor, REST } from './baseSequence';
import { validateCells } from './validator';
import { buildStats } from './stats';

interface Duty {
  start: Date;
  end: Date;
}

class GuardTimeline {
  readonly id: string;
  external: Duty[] = [];
  placed: Cell[] = [];
  onLeave = false;
  leaveWindows: { start: Date; end: Date }[] = [];

  constructor(id: string) {
    this.id = id;
  }

  allDuties(): Duty[] {
    const out: Duty[] = [];
    for (const d of this.external) out.push({ start: d.start, end: d.end });
    for (const c of this.placed) out.push({ start: c.startAt, end: c.endAt });
    return out;
  }

  prevDutyBefore(t: Date): Duty | null {
    let best: Duty | null = null;
    for (const d of this.allDuties()) {
      if (d.end.getTime() <= t.getTime() && (!best || d.end.getTime() > best.end.getTime())) best = d;
    }
    return best;
  }

  nextDutyAfter(t: Date): Duty | null {
    let best: Duty | null = null;
    for (const d of this.allDuties()) {
      if (d.start.getTime() >= t.getTime() && (!best || d.start.getTime() < best.start.getTime())) best = d;
    }
    return best;
  }

  hasOverlap(start: Date, end: Date, exclude?: Cell): Duty | null {
    for (const c of this.placed) {
      if (exclude && c === exclude) continue;
      if (overlaps(start, end, c.startAt, c.endAt)) return { start: c.startAt, end: c.endAt };
    }
    for (const d of this.external) {
      if (overlaps(start, end, d.start, d.end)) return d;
    }
    return null;
  }

  isUnavailable(start: Date, end: Date): boolean {
    if (this.onLeave) return true;
    for (const w of this.leaveWindows) {
      if (start.getTime() < w.end.getTime() && w.start.getTime() < end.getTime()) return true;
    }
    return false;
  }
}

interface Violation {
  code: 'ON_LEAVE' | 'OVERLAP' | 'REST_BEFORE' | 'REST_AFTER';
  message: string;
  details: Record<string, string | number | undefined>;
  severity: 'CRITICAL' | 'REST' | 'STAFFING';
}

function fmt(d: Date): string {
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function checkAssignment(
  tl: GuardTimeline,
  guardName: string,
  shift: ShiftDef,
  start: Date,
  end: Date,
  restRules: ReturnType<typeof normalizeRestRules>,
  opts: { checkAfter?: boolean; excludeCell?: Cell } = {},
): Violation[] {
  const out: Violation[] = [];

  if (tl.isUnavailable(start, end)) {
    out.push({
      code: 'ON_LEAVE',
      severity: 'CRITICAL',
      message: `${guardName} is on leave during ${fmt(start)} – ${fmt(end)}.`,
      details: { guardName },
    });
  }

  const clash = tl.hasOverlap(start, end, opts.excludeCell);
  if (clash) {
    out.push({
      code: 'OVERLAP',
      severity: 'CRITICAL',
      message: `${guardName} is already on duty ${fmt(clash.start)} – ${fmt(clash.end)} (possibly at another site).`,
      details: { otherStart: fmt(clash.start), otherEnd: fmt(clash.end) },
    });
  }

  const prev = tl.prevDutyBefore(start);
  if (prev && prev.end.getTime() <= start.getTime()) {
    const prevDurHours = hoursBetween(prev.start, prev.end);
    const needMs = minRestMsAfter(prevDurHours, restRules);
    const restMs = start.getTime() - prev.end.getTime();
    if (restMs < needMs) {
      out.push({
        code: 'REST_BEFORE',
        severity: 'REST',
        message:
          `${guardName} has only ${Math.round(restMs / HOUR_MS)}h recovery before this shift ` +
          `(needs ${Math.round(needMs / HOUR_MS)}h after the previous shift ended ${fmt(prev.end)}).`,
        details: {
          guardName,
          requiredHours: Math.round(needMs / HOUR_MS),
          actualHours: Math.round(restMs / HOUR_MS),
          differenceHours: Math.round((restMs - needMs) / HOUR_MS),
          previousEnd: fmt(prev.end),
          assignedStart: fmt(start),
          previousDurationHours: Math.round(prevDurHours),
        },
      });
    }
  }

  if (opts.checkAfter !== false) {
    const next = tl.nextDutyAfter(end);
    if (next) {
      const needMs = minRestMsAfter(shift.durationHours, restRules);
      const restMs = next.start.getTime() - end.getTime();
      if (restMs < needMs) {
        out.push({
          code: 'REST_AFTER',
          severity: 'REST',
          message:
            `${guardName} would only get ${Math.round(restMs / HOUR_MS)}h recovery after this shift ` +
            `before the next duty starting ${fmt(next.start)} (needs ${Math.round(needMs / HOUR_MS)}h).`,
          details: {
            guardName,
            requiredHours: Math.round(needMs / HOUR_MS),
            actualHours: Math.round(restMs / HOUR_MS),
            differenceHours: Math.round((restMs - needMs) / HOUR_MS),
            assignedEnd: fmt(end),
            nextStart: fmt(next.start),
          },
        });
      }
    }
  }

  return out;
}

function isNightishKey(key: string): boolean {
  return key.toUpperCase().includes('NIGHT');
}

function isNightish(cell: Cell): boolean {
  if (isNightishKey(cell.shiftKey)) return true;
  const crosses = Math.floor(cell.startAt.getTime() / DAY_MS) !== Math.floor(cell.endAt.getTime() / DAY_MS);
  const durMs = cell.endAt.getTime() - cell.startAt.getTime();
  // custom shifts that cross midnight count as night duties (24h shifts excluded)
  return crosses && durMs < 24 * HOUR_MS && !cell.shiftKey.toUpperCase().includes('DAY');
}

function loadHours(tl: GuardTimeline): { hours: number; nights: number } {
  let hours = 0;
  let nights = 0;
  for (const c of tl.placed) {
    hours += hoursBetween(c.startAt, c.endAt);
    if (isNightish(c)) nights += 1;
  }
  return { hours, nights };
}

function fmtIntervals(start: Date, end: Date): { s: number; e: number } {
  return { s: start.getTime(), e: end.getTime() };
}

export function generateSchedule(input: EngineInput): GenerationReport {
  // ── STAGE 1: validate configuration ──────────────────────────────────────
  const warnings: string[] = [];
  const conflicts: ConflictIssue[] = [];

  if (!input.pool || input.pool.length === 0) throw new EngineConfigError('No guards in the pool');
  if (!input.shifts || input.shifts.length === 0) throw new EngineConfigError('No shift definitions configured');
  if (!input.days || input.days < 1) throw new EngineConfigError('Rotation period must be at least 1 day');
  if (input.days > 366) throw new EngineConfigError('Rotation period cannot exceed 366 days');

  const shifts: ShiftDef[] = [];
  for (const raw of input.shifts) {
    try {
      const s = resolveShift(raw);
      if (s.requiredCount > 0) shifts.push(s);
      else warnings.push(`Shift "${s.name}" requires 0 guards — it will not appear in the schedule.`);
    } catch (e: any) {
      throw new EngineConfigError(e.message || `Invalid shift "${raw.key}"`);
    }
  }
  if (shifts.length === 0) throw new EngineConfigError('Total daily requirement is 0 — configure at least one guard per shift');

  const restRules = normalizeRestRules(input.restRules);
  const totalRequired = shifts.reduce((s, d) => s + d.requiredCount, 0);
  const pool = [...input.pool].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const N = pool.length;

  if (N < totalRequired) {
    warnings.push(
      `Guard pool (${N}) is smaller than the daily requirement (${totalRequired}). ` +
      `The schedule will still be generated, but every guard must work every day and recovery rules cannot be maintained.`,
    );
  }

  const startDate = midnightOf(input.startDate);
  const dutyHoursMean = shifts.reduce((s, d) => s + d.durationHours * d.requiredCount, 0) / totalRequired;

  for (const g of pool) {
    if (g.category && g.category !== 'GUARD') {
      conflicts.push({
        id: `cfg-invalid-${g.id}`,
        severity: 'CRITICAL',
        code: 'INVALID_GUARD',
        title: 'Invalid guard in pool',
        message: `${g.name} is not a guard — they cannot be scheduled for guard duties.`,
        guardId: g.id,
        guardName: g.name,
        suggestions: ['Remove this person from the guard pool'],
      });
    } else if (g.status === 'TERMINATED' || g.status === 'INACTIVE') {
      conflicts.push({
        id: `cfg-inactive-${g.id}`,
        severity: 'STAFFING',
        code: 'INVALID_GUARD',
        title: 'Unavailable guard in pool',
        message: `${g.name} is ${g.status.toLowerCase()} but still in the pool.`,
        guardId: g.id,
        guardName: g.name,
        suggestions: ['Remove this guard from the pool'],
      });
    }
  }

  // ── STAGE 2: base sequence ───────────────────────────────────────────────
  const { sequence: base, unplaced } = buildBaseSequenceFromSlots(
    N,
    shifts.map((s) => ({ key: s.key, count: s.requiredCount })),
  );

  const unplacedKeys = Object.keys(unplaced);
  if (unplacedKeys.length > 0) {
    const detail = unplacedKeys.map((k) => `${unplaced[k]} × ${shifts.find((s) => s.key === k)?.name || k}`).join(', ');
    conflicts.push({
      id: 'cfg-pool-too-small',
      severity: 'CRITICAL',
      code: 'COVERAGE_SHORTAGE',
      title: 'Coverage shortage — pool too small',
      message:
        `The guard pool of ${N} cannot cover the required ${totalRequired} daily positions (${detail} left unfilled ` +
        `every day). Coverage will be short by ${totalRequired - N} position(s) daily.`,
      details: { pool: N, required: totalRequired, missing: totalRequired - N },
      suggestions: [
        `Add at least ${Math.max(0, totalRequired - N)} more guard(s) to the pool`,
        'Reduce the daily requirement',
      ],
    });
  }

  // ── STAGE 3: seed ────────────────────────────────────────────────────────
  const shiftByKey = new Map(shifts.map((s) => [s.key, s]));
  const cells: Cell[] = [];
  const slotCounterByDay = new Map<string, number>();

  for (let d = 0; d < input.days; d++) {
    const dayDate = addDays(startDate, d);
    for (let i = 0; i < N; i++) {
      const token = slotFor(base, d, i);
      if (token === REST) continue;
      const shift = shiftByKey.get(token);
      if (!shift) continue;
      const { start, end } = shiftInterval(dayDate, shift);
      const ck = `${d}:${token}`;
      const slotIndex = slotCounterByDay.get(ck) || 0;
      slotCounterByDay.set(ck, slotIndex + 1);
      cells.push({
        guardId: pool[i].id,
        dayIndex: d,
        date: ymd(dayDate),
        shiftKey: token,
        shiftName: shift.name,
        slotIndex,
        startAt: start,
        endAt: end,
      });
    }
  }

  // ── STAGE 4: guard timelines ────────────────────────────────────────────
  const timelines = new Map<string, GuardTimeline>();
  const nameById = new Map<string, string>();
  for (const g of pool) {
    timelines.set(g.id, new GuardTimeline(g.id));
    nameById.set(g.id, g.name);
  }
  for (const duty of input.externalDuties) {
    timelines.get(duty.guardId)?.external.push({ start: duty.start, end: duty.end });
  }
  for (const id of input.onLeaveGuards) {
    const tl = timelines.get(id);
    if (tl) tl.onLeave = true;
  }
  for (const w of input.leaveWindows) {
    timelines.get(w.guardId)?.leaveWindows.push({ start: w.start, end: w.end });
  }
  for (const c of cells) timelines.get(c.guardId)?.placed.push(c);

  // ── STAGE 5: constraint-repair pass ─────────────────────────────────────
  let repairs = 0;

  const cellsByDay = (d: number) =>
    cells.filter((c) => c.dayIndex === d).sort((a, b) => a.slotIndex - b.slotIndex || a.shiftKey.localeCompare(b.shiftKey));

  const workingOnDay = (d: number): Set<string> => new Set(cellsByDay(d).map((c) => c.guardId));

  const detach = (cell: Cell) => {
    const tl = timelines.get(cell.guardId);
    if (!tl) return;
    const idx = tl.placed.indexOf(cell);
    if (idx >= 0) tl.placed.splice(idx, 1);
  };
  const attach = (cell: Cell, guardId: string) => {
    cell.guardId = guardId;
    timelines.get(guardId)?.placed.push(cell);
  };

  /** Would `guardId` be feasible for this cell's interval? Cell is excluded from its current holder during the check. */
  const tryPlace = (guardId: string, cell: Cell, opts?: { checkAfter?: boolean }): Violation[] => {
    const tl = timelines.get(guardId);
    if (!tl) return [{ code: 'OVERLAP', severity: 'CRITICAL', message: 'Unknown guard', details: {} }];
    const shift = shiftByKey.get(cell.shiftKey);
    if (!shift) return [{ code: 'OVERLAP', severity: 'CRITICAL', message: 'Unknown shift', details: {} }];
    // exclude the cell itself wherever it currently sits (self-overlap must not fire)
    return checkAssignment(tl, nameById.get(guardId) || guardId, shift, cell.startAt, cell.endAt, restRules, {
      checkAfter: opts?.checkAfter !== false,
      excludeCell: cell,
    });
  };

  const meanHoursNow = (): number => {
    let sum = 0;
    for (const g of pool) sum += loadHours(timelines.get(g.id)!).hours;
    return sum / Math.max(1, pool.length);
  };

  for (let d = 0; d < input.days; d++) {
    const dayCells = cellsByDay(d);
    // snapshot length — cells array is stable; guard ids may change
    for (const cell of [...dayCells]) {
      const blocking = tryPlace(cell.guardId, cell);
      if (blocking.length === 0) continue;

      const working = workingOnDay(d);
      const restCandidates = pool.filter((g) => !working.has(g.id) && g.id !== cell.guardId)
        .sort((a, b) => a.id.localeCompare(b.id));
      const swapCandidates = dayCells.filter((c) => c !== cell && c.guardId !== cell.guardId);

      let bestApply: (() => void) | null = null;
      let bestScore = Infinity;
      const mH = meanHoursNow();

      // pure reassignment: resting guard takes the cell
      for (const g of restCandidates) {
        const viols = tryPlace(g.id, cell);
        if (viols.length > 0) continue;
        const { hours, nights } = loadHours(timelines.get(g.id)!);
        const score = (hours - mH) ** 2 + dutyHoursMean ** 2 * nights * 0.25;
        if (score < bestScore) {
          bestScore = score;
          bestApply = () => {
            detach(cell);
            attach(cell, g.id);
          };
        }
      }

      // mutual swap with a same-day working guard
      if (!bestApply) {
        for (const other of swapCandidates) {
          if (!tryPlace(other.guardId, cell).length) continue;
          // simulate: other takes cell, cell's guard takes other's cell
          const gMine = cell.guardId;
          const gOther = other.guardId;
          const tlMine = timelines.get(gMine)!;
          const tlOther = timelines.get(gOther)!;
          const iMine = tlMine.placed.indexOf(cell);
          const iOther = tlOther.placed.indexOf(other);
          if (iMine < 0 || iOther < 0) continue;
          tlMine.placed.splice(iMine, 1);
          tlOther.placed.splice(iOther, 1);
          tlMine.placed.push(other);
          tlOther.placed.push(cell);
          cell.guardId = gOther;
          other.guardId = gMine;
          const violOtherOnCell = tryPlace(gOther, cell);
          const violMineOnOther = tryPlace(gMine, other);
          const ok = violOtherOnCell.length === 0 && violMineOnOther.length === 0;
          let score = Infinity;
          if (ok) {
            const { hours, nights } = loadHours(tlOther);
            score = (hours - mH) ** 2 + dutyHoursMean ** 2 * nights * 0.25;
          }
          // revert simulation always
          cell.guardId = gMine;
          other.guardId = gOther;
          const tlMineNow = timelines.get(cell.guardId)!;
          const tlOtherNow = timelines.get(other.guardId)!;
          const im = tlMineNow.placed.indexOf(other);
          const io = tlOtherNow.placed.indexOf(cell);
          if (im >= 0) tlMineNow.placed.splice(im, 1);
          if (io >= 0) tlOtherNow.placed.splice(io, 1);
          if (!tlMineNow.placed.includes(cell)) tlMineNow.placed.push(cell);
          if (!tlOtherNow.placed.includes(other)) tlOtherNow.placed.push(other);

          if (ok && score < bestScore) {
            bestScore = score;
            const otherCell = other;
            bestApply = () => {
              const a = cell.guardId;
              const b = otherCell.guardId;
              detach(cell);
              detach(otherCell);
              attach(cell, b);
              attach(otherCell, a);
            };
          }
        }
      }

      if (bestApply) {
        bestApply();
        repairs += 1;
        const after = tryPlace(cell.guardId, cell);
        if (after.length > 0) conflicts.push(buildConflict(cell, after[0], nameById));
      } else {
        conflicts.push(buildConflict(cell, blocking[0], nameById));
      }
    }
  }

  // ── STAGE 6: fairness passes (only when repairs disturbed the pattern) ──
  if (repairs > 0) {
    const objective = (): number => {
      let J = 0;
      const hours: number[] = [];
      const nights: number[] = [];
      for (const g of pool) {
        const { hours: h, nights: n } = loadHours(timelines.get(g.id)!);
        hours.push(h);
        nights.push(n);
      }
      const avgH = hours.reduce((a, b) => a + b, 0) / hours.length;
      const avgN = nights.reduce((a, b) => a + b, 0) / nights.length;
      for (let i = 0; i < hours.length; i++) {
        J += (hours[i] - avgH) ** 2;
        J += dutyHoursMean ** 2 * (nights[i] - avgN) ** 2;
      }
      return J;
    };

    let J = objective();
    const EPS = 1e-6;
    for (let round = 0; round < 3; round++) {
      let improved = false;
      for (let d = 0; d < input.days && !improved; d++) {
        const dayCells = cellsByDay(d);
        for (let a = 0; a < dayCells.length && !improved; a++) {
          for (let b = a + 1; b < dayCells.length && !improved; b++) {
            const ca = dayCells[a];
            const cb = dayCells[b];
            if (ca.guardId === cb.guardId) continue;
            const gA = ca.guardId;
            const gB = cb.guardId;
            const tlA = timelines.get(gA)!;
            const tlB = timelines.get(gB)!;
            // simulate swap: ca <-> cb guard ids
            const ia = tlA.placed.indexOf(ca);
            const ib = tlB.placed.indexOf(cb);
            if (ia < 0 || ib < 0) continue;
            tlA.placed.splice(ia, 1);
            tlB.placed.splice(ib, 1);
            tlA.placed.push(cb);
            tlB.placed.push(ca);
            ca.guardId = gB;
            cb.guardId = gA;
            const vA = tryPlace(gB, ca);
            const vB = tryPlace(gA, cb);
            let accepted = false;
            if (vA.length === 0 && vB.length === 0) {
              const Jnew = objective();
              if (Jnew < J - EPS) {
                J = Jnew;
                accepted = true;
                improved = true;
              }
            }
            if (!accepted) {
              // revert: move cells back to original timelines/ids
              ca.guardId = gA;
              cb.guardId = gB;
              const tlA2 = timelines.get(gA)!;
              const tlB2 = timelines.get(gB)!;
              // ca currently in tlB, cb currently in tlA
              const icbInA = tlA2.placed.indexOf(cb);
              if (icbInA >= 0) tlA2.placed.splice(icbInA, 1);
              const icaInB = tlB2.placed.indexOf(ca);
              if (icaInB >= 0) tlB2.placed.splice(icaInB, 1);
              if (!tlA2.placed.includes(ca)) tlA2.placed.push(ca);
              if (!tlB2.placed.includes(cb)) tlB2.placed.push(cb);
            }
          }
        }
      }
      if (!improved) break;
    }
  }

  // ── rebuild flat cell list from timelines (ids consistent) ──────────────
  const finalCells: Cell[] = [];
  for (const g of pool) {
    for (const c of timelines.get(g.id)!.placed) finalCells.push(c);
  }
  finalCells.sort((a, b) => a.dayIndex - b.dayIndex || a.slotIndex - b.slotIndex || a.shiftKey.localeCompare(b.shiftKey));

  // ── STAGE 7: independent validation ─────────────────────────────────────
  const validation = validateCells(
    {
      cells: finalCells,
      pool,
      shifts,
      restRules,
      startDate,
      days: input.days,
      externalDuties: input.externalDuties,
      leaveWindows: input.leaveWindows,
      onLeaveGuards: input.onLeaveGuards,
    },
    nameById,
  );

  // merge: stage-5 conflicts first, then validator findings not already covered
  const keyOf = (c: ConflictIssue) => `${c.code}|${c.guardId || ''}|${c.date || ''}|${c.shiftKey || ''}|${c.title}`;
  const dedup = new Map<string, ConflictIssue>();
  for (const c of conflicts) {
    const k = keyOf(c);
    if (!dedup.has(k)) dedup.set(k, c);
  }
  for (const c of validation.conflicts) {
    const k = keyOf(c);
    if (!dedup.has(k)) dedup.set(k, c);
  }
  const finalConflicts = [...dedup.values()];

  // ── STAGE 8: statistics ─────────────────────────────────────────────────
  const stats = buildStats({
    cells: finalCells,
    pool,
    shifts,
    restRules,
    startDate,
    days: input.days,
    externalDuties: input.externalDuties,
    nameById,
    unplaced,
  });

  if (stats.staffing.recommendedAdditional > 0) {
    finalConflicts.push({
      id: 'staffing',
      severity: 'STAFFING',
      code: 'STAFFING_WARNING',
      title: 'Additional guards recommended',
      message:
        `The configured recovery rules need about ${stats.staffing.estimatedMinPool} guards to cover ` +
        `${totalRequired} daily positions; the pool has ${N}. ` +
        `Adding ${stats.staffing.recommendedAdditional} more guard(s) would let every rule be met comfortably.`,
      details: {
        requiredDaily: totalRequired,
        pool: N,
        estimatedMinPool: stats.staffing.estimatedMinPool,
        recommended: stats.staffing.recommendedAdditional,
      },
      suggestions: [`Add ${stats.staffing.recommendedAdditional} guard(s) to the pool`],
    });
  }

  const blockingCount = finalConflicts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').length;
  const feasibility: Feasibility = blockingCount === 0 ? 'FULLY_COMPLIANT' : 'BEST_POSSIBLE';
  if (feasibility === 'BEST_POSSIBLE') {
    warnings.push('Schedule generated with warnings — some staffing rules could not be fully satisfied with the current guard pool.');
  }

  return {
    cells: finalCells,
    conflicts: finalConflicts,
    stats,
    feasibility,
    warnings,
    algorithmVersion: ALGORITHM_VERSION,
    rulesFingerprint: rulesFingerprint(JSON.stringify(input.shifts), restRules),
  };
}

function buildConflict(cell: Cell, v: Violation, nameById: Map<string, string>): ConflictIssue {
  const guardName = nameById.get(cell.guardId) || cell.guardId;
  const code =
    v.code === 'ON_LEAVE' ? 'ON_LEAVE' : v.code === 'OVERLAP' ? 'OVERLAP' : 'REST_VIOLATION';
  const title =
    v.code === 'ON_LEAVE' ? 'Assigned while on leave'
    : v.code === 'OVERLAP' ? 'Overlapping assignment'
    : 'Required recovery time could not be maintained';
  const suggestions =
    v.code === 'REST_BEFORE' || v.code === 'REST_AFTER'
      ? ['Replace guard', 'Add guard to pool', 'Reduce daily requirement']
      : v.code === 'OVERLAP'
      ? ['Replace guard', 'Remove the conflicting assignment']
      : ['Replace guard', 'Remove from pool while on leave'];
  return {
    id: `cell-${cell.dayIndex}-${cell.shiftKey}-${cell.slotIndex}-${cell.guardId}`,
    severity: v.severity,
    code,
    title,
    message: v.message,
    guardId: cell.guardId,
    guardName,
    dayIndex: cell.dayIndex,
    date: cell.date,
    shiftKey: cell.shiftKey,
    details: v.details,
    suggestions,
  };
}

void fmtIntervals;
