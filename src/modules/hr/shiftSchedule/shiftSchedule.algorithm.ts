/**
 * Shift Scheduling Algorithm (pure, DB-free — unit-testable).
 *
 * Replaces the legacy rotation round-robin with a fair-rest greedy scheduler:
 *
 * Rules implemented (per operations requirement):
 *  1. 12h duty  -> at least 12h rest before the next duty starts.
 *  2. 24h duty  -> at least 48h rest before the next duty starts.
 *  3. Cross-site awareness: every guard carries a global timeline (duties from
 *     OTHER schedules plus manual shift assignments). A guard is never
 *     double-booked (overlap is a HARD constraint) and rest is checked on
 *     BOTH sides of a candidate slot (since last duty ended AND until the
 *     next already-committed duty starts).
 *  4. Fairness: the guard with the FEWEST duties is preferred, then the most
 *     rested, then day/night alternation (nobody gets stuck on nights), then
 *     day/night balance, then stable pool order. With guards A,B,C and one
 *     DAY + one NIGHT slot this produces the classic fair cycle:
 *       d1: A day / B night -> d2: C day / A night -> d3: B day / C night ...
 *  5. Shortage override: when NO guard satisfies the rest rule but someone is
 *     at least overlap-free, the most-rested overlap-free guard is assigned
 *     anyway and the duty is flagged as an override (warning recorded).
 *     If not even that is possible, the slot is reported as uncovered.
 */

export type ShiftMode = 'STANDARD_12H' | 'SINGLE_24H';
export type ShiftType = 'DAY' | 'NIGHT' | 'FULL';

export interface AlgorithmTimeWindow {
  start: Date;
  end: Date;
}

export interface ExternalDuty {
  guardId: string;
  start: Date;
  end: Date;
  /** Where the duty comes from (for warning messages). */
  source?: string;
}

export interface AlgorithmPoolEntry {
  id: string;
  order: number;
}

export interface AlgorithmConfig {
  shiftMode: ShiftMode;
  /** Guards required on the day shift (12h mode) or the 24h duty (24h mode). */
  dayCount: number;
  /** Guards required on the night shift (12h mode only). */
  nightCount: number;
  dayStartTime: string;
  dayEndTime: string;
  nightStartTime: string;
  nightEndTime: string;
  pool: AlgorithmPoolEntry[];
  floaters: AlgorithmPoolEntry[];
  /** Existing duties from other schedules / manual assignments. */
  external: ExternalDuty[];
  /** First day to schedule (00:00 local). */
  from: Date;
  /** Number of days to schedule. */
  days: number;
}

export interface AlgorithmAssignment {
  date: Date;
  guardId: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
  isOverride: boolean;
  source: 'POOL' | 'FLOATER';
  /** Actual rest hours before this duty (null = fresh guard / not computed). */
  restHoursBefore: number | null;
}

export interface AlgorithmWarning {
  date: Date;
  shiftType: ShiftType;
  kind: 'OVERRIDE' | 'UNCOVERED';
  message: string;
}

export interface AlgorithmResult {
  assignments: AlgorithmAssignment[];
  warnings: AlgorithmWarning[];
  uncoveredSlots: number;
}

interface GuardState {
  id: string;
  order: number;
  source: 'POOL' | 'FLOATER';
  committed: AlgorithmTimeWindow[];
  external: AlgorithmTimeWindow[];
  totalShifts: number;
  dayShifts: number;
  nightShifts: number;
  lastShiftType: ShiftType | null;
}

const HOUR_MS = 3600000;
const DAY_MS = 86400000;
const MAX_REST_CAP_MS = 7 * DAY_MS; // rest display cap so ties stay readable

export function parseHM(value: string | undefined | null, fallback: string): { h: number; m: number } {
  const src = value && value.includes(':') ? value : fallback;
  const parts = String(src).split(':');
  const h = parseInt(parts[0], 10);
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

export function atTime(date: Date, h: number, m: number): Date {
  const d = new Date(date.getTime());
  d.setHours(h, m, 0, 0);
  return d;
}

/** Absolute window of a shift slot on a calendar day (night shifts cross midnight). */
export function slotWindow(
  cfg: Pick<AlgorithmConfig, 'shiftMode' | 'dayStartTime' | 'dayEndTime' | 'nightStartTime' | 'nightEndTime'>,
  date: Date,
  shiftType: ShiftType
): AlgorithmTimeWindow {
  if (shiftType === 'FULL') {
    const s = parseHM(cfg.dayStartTime, '06:00');
    const start = atTime(date, s.h, s.m);
    return { start, end: new Date(start.getTime() + DAY_MS) };
  }
  if (shiftType === 'DAY') {
    const s = parseHM(cfg.dayStartTime, '06:00');
    const e = parseHM(cfg.dayEndTime, '18:00');
    const start = atTime(date, s.h, s.m);
    let end = atTime(date, e.h, e.m);
    if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + DAY_MS);
    return { start, end };
  }
  const s = parseHM(cfg.nightStartTime, '18:00');
  const e = parseHM(cfg.nightEndTime, '06:00');
  const start = atTime(date, s.h, s.m);
  let end = atTime(date, e.h, e.m);
  if (end.getTime() <= start.getTime()) end = new Date(end.getTime() + DAY_MS);
  return { start, end };
}

/** Required rest after a duty of this kind, in ms (12h work -> 12h rest, 24h work -> 48h rest). */
export function requiredRestMs(cfg: Pick<AlgorithmConfig, 'shiftMode'>, window: AlgorithmTimeWindow): number {
  if (cfg.shiftMode === 'SINGLE_24H') return 48 * HOUR_MS;
  return Math.max(HOUR_MS, window.end.getTime() - window.start.getTime());
}

function overlaps(a: AlgorithmTimeWindow, b: AlgorithmTimeWindow): boolean {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

function restBefore(windows: AlgorithmTimeWindow[], window: AlgorithmTimeWindow): number {
  let latestEnd = -1;
  for (const w of windows) {
    if (w.end.getTime() <= window.start.getTime() && w.end.getTime() > latestEnd) {
      latestEnd = w.end.getTime();
    }
  }
  return latestEnd < 0 ? Number.POSITIVE_INFINITY : window.start.getTime() - latestEnd;
}

function restAfter(windows: AlgorithmTimeWindow[], window: AlgorithmTimeWindow): number {
  let earliestStart = Number.POSITIVE_INFINITY;
  for (const w of windows) {
    if (w.start.getTime() >= window.end.getTime() && w.start.getTime() < earliestStart) {
      earliestStart = w.start.getTime();
    }
  }
  return earliestStart === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : earliestStart - window.end.getTime();
}

/** Any overlapping window (committed or external) makes the guard ineligible — always. */
function hasOverlap(guard: GuardState, window: AlgorithmTimeWindow): boolean {
  for (const w of guard.committed) if (overlaps(w, window)) return true;
  for (const w of guard.external) if (overlaps(w, window)) return true;
  return false;
}

function fmtHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function restLabel(restMs: number): string {
  if (!Number.isFinite(restMs)) return 'no previous duty';
  const hours = Math.round((restMs / HOUR_MS) * 10) / 10;
  return `${hours}h rest`;
}

interface Candidate {
  state: GuardState;
  restBeforeMs: number;
  restAfterMs: number;
  typeMismatch: number;
  balancePenalty: number;
}

/** Fairness comparator — lower score wins. Order: fewest duties → most rest → alternation → balance → pool order. */
function betterEligible(a: Candidate, b: Candidate): Candidate {
  if (a.state.totalShifts !== b.state.totalShifts) return a.state.totalShifts < b.state.totalShifts ? a : b;
  const ar = Math.min(a.restBeforeMs, MAX_REST_CAP_MS);
  const br = Math.min(b.restBeforeMs, MAX_REST_CAP_MS);
  if (ar !== br) return ar > br ? a : b;
  if (a.typeMismatch !== b.typeMismatch) return a.typeMismatch < b.typeMismatch ? a : b;
  if (a.balancePenalty !== b.balancePenalty) return a.balancePenalty < b.balancePenalty ? a : b;
  if (a.state.order !== b.state.order) return a.state.order < b.state.order ? a : b;
  return a.state.id <= b.state.id ? a : b;
}

/** Override comparator — most rested first, then fewest duties, then pool order. */
function betterOverride(a: Candidate, b: Candidate): Candidate {
  const ar = Math.min(a.restBeforeMs, MAX_REST_CAP_MS);
  const br = Math.min(b.restBeforeMs, MAX_REST_CAP_MS);
  if (ar !== br) return ar > br ? a : b;
  if (a.state.totalShifts !== b.state.totalShifts) return a.state.totalShifts < b.state.totalShifts ? a : b;
  if (a.state.order !== b.state.order) return a.state.order < b.state.order ? a : b;
  return a.state.id <= b.state.id ? a : b;
}

/**
 * Build the schedule. Deterministic given (config, external duties).
 * Slots are filled day by day, all DAY slots first, then all NIGHT slots.
 */
export function buildSchedule(cfg: AlgorithmConfig): AlgorithmResult {
  const assignments: AlgorithmAssignment[] = [];
  const warnings: AlgorithmWarning[] = [];
  let uncoveredSlots = 0;

  const states = new Map<string, GuardState>();
  cfg.pool.forEach((p, i) => {
    states.set(p.id, {
      id: p.id, order: p.order ?? i, source: 'POOL',
      committed: [], external: [], totalShifts: 0, dayShifts: 0, nightShifts: 0, lastShiftType: null,
    });
  });
  cfg.floaters.forEach((p, i) => {
    if (states.has(p.id)) return;
    states.set(p.id, {
      id: p.id, order: p.order ?? i, source: 'FLOATER',
      committed: [], external: [], totalShifts: 0, dayShifts: 0, nightShifts: 0, lastShiftType: null,
    });
  });

  for (const duty of cfg.external) {
    const st = states.get(duty.guardId);
    if (!st) continue;
    st.external.push({ start: new Date(duty.start.getTime()), end: new Date(duty.end.getTime()) });
  }
  for (const st of states.values()) {
    st.external.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  const single24 = cfg.shiftMode === 'SINGLE_24H';
  const daySlots = Math.max(0, cfg.dayCount);
  const nightSlots = single24 ? 0 : Math.max(0, cfg.nightCount);
  if (daySlots + nightSlots <= 0 || states.size === 0) {
    return { assignments, warnings, uncoveredSlots };
  }

  const from = new Date(cfg.from.getTime());
  from.setHours(0, 0, 0, 0);

  for (let d = 0; d < Math.max(1, cfg.days); d += 1) {
    const date = new Date(from.getTime() + d * DAY_MS);

    const slotTypes: ShiftType[] = [];
    for (let i = 0; i < daySlots; i += 1) slotTypes.push(single24 ? 'FULL' : 'DAY');
    for (let i = 0; i < nightSlots; i += 1) slotTypes.push('NIGHT');

    for (const shiftType of slotTypes) {
      const window = slotWindow(cfg, date, shiftType);
      const requiredRest = requiredRestMs(cfg, window);

      let bestEligible: Candidate | null = null;
      let bestOverride: Candidate | null = null;

      for (const st of states.values()) {
        if (hasOverlap(st, window)) continue;
        const timeline = st.committed.concat(st.external);
        const rb = restBefore(timeline, window);
        const ra = restAfter(timeline, window);
        // Alternation: for a DAY slot prefer a guard whose last duty was NIGHT (or none).
        const typeMismatch =
          shiftType === 'DAY' ? (st.lastShiftType === 'NIGHT' ? 0 : 1)
          : shiftType === 'NIGHT' ? (st.lastShiftType === 'DAY' ? 0 : 1)
          : 0;
        const balancePenalty =
          shiftType === 'NIGHT' ? st.nightShifts - st.dayShifts : st.dayShifts - st.nightShifts;
        const cand: Candidate = { state: st, restBeforeMs: rb, restAfterMs: ra, typeMismatch, balancePenalty };

        const compliant = rb >= requiredRest && ra >= requiredRest;
        if (compliant && (!bestEligible || betterEligible(cand, bestEligible))) bestEligible = cand;
        if (!bestOverride || betterOverride(cand, bestOverride)) bestOverride = cand;
      }

      const chosen = bestEligible || bestOverride;
      if (!chosen) {
        uncoveredSlots += 1;
        warnings.push({
          date: new Date(date.getTime()),
          shiftType,
          kind: 'UNCOVERED',
          message: `${shiftType === 'NIGHT' ? 'Night' : shiftType === 'FULL' ? '24h' : 'Day'} slot on ${fmtDay(date)} left UNCOVERED — every guard (and floater) is already on duty during this window.`,
        });
        continue;
      }

      const st = chosen.state;
      st.committed.push({ start: new Date(window.start.getTime()), end: new Date(window.end.getTime()) });
      st.totalShifts += 1;
      if (shiftType === 'DAY') st.dayShifts += 1;
      else if (shiftType === 'NIGHT') st.nightShifts += 1;
      st.lastShiftType = shiftType;

      const isOverride = !bestEligible;
      if (isOverride) {
        warnings.push({
          date: new Date(date.getTime()),
          shiftType,
          kind: 'OVERRIDE',
          message: `${shiftType === 'NIGHT' ? 'Night' : shiftType === 'FULL' ? '24h' : 'Day'} slot on ${fmtDay(date)}: required rest is ${Math.round(requiredRest / HOUR_MS)}h but the most rested available guard has ${restLabel(chosen.restBeforeMs)} — assigned anyway to keep the post covered (pool too small).`,
        });
      }

      assignments.push({
        date: new Date(date.getTime()),
        guardId: st.id,
        shiftType,
        startTime: fmtHM(window.start),
        endTime: fmtHM(window.end),
        startAt: new Date(window.start.getTime()),
        endAt: new Date(window.end.getTime()),
        isOverride,
        source: st.source,
        restHoursBefore: Number.isFinite(chosen.restBeforeMs)
          ? Math.round((chosen.restBeforeMs / HOUR_MS) * 10) / 10
          : null,
      });
    }
  }

  return { assignments, warnings, uncoveredSlots };
}


