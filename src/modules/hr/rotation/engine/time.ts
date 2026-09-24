/**
 * Time utilities for the scheduling engine.
 *
 * All rest/duration math is done on integer milliseconds so that boundary
 * cases (exactly 24h rest) compare exactly — no floating point drift.
 */

import { ShiftDef, ShiftDefInput } from './types';

export const HOUR_MS = 3600000;
export const DAY_MS = 86400000;

/** Parse 'HH:MM' -> minutes since midnight. Throws on invalid input. */
export function parseHM(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
  if (!m) throw new Error(`Invalid time "${hm}" (expected HH:MM)`);
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) throw new Error(`Invalid time "${hm}"`);
  return h * 60 + min;
}

/** minutes since midnight -> 'HH:MM' */
export function fmtHM(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Add hours (may be fractional) to a 'HH:MM' string, wrapping at 24h. */
export function addHoursToHM(hm: string, hours: number): string {
  return fmtHM(parseHM(hm) + Math.round(hours * 60));
}

/** Midnight (local) of the given date. */
export function midnightOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 'YYYY-MM-DD' in local time. */
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/** Whole days between two midnights (b - a), floor. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((midnightOf(b).getTime() - midnightOf(a).getTime()) / DAY_MS);
}

/**
 * Resolve a raw shift definition into minutes + duration.
 *
 * Rules (PHASE 5):
 *  - end > start  => same-day shift, duration = end - start
 *  - end < start  => crosses midnight, duration = (24h - start) + end   (18:00 -> 06:00 = 12h, NOT -12h)
 *  - end === start => 24-hour shift (06:00 -> next day 06:00)
 */
export function resolveShift(s: ShiftDefInput): ShiftDef {
  const startMin = parseHM(s.startTime);
  const endMin = parseHM(s.endTime);
  let durationMin: number;
  let crossesMidnight: boolean;
  if (endMin === startMin) {
    durationMin = 24 * 60;
    crossesMidnight = true;
  } else if (endMin < startMin) {
    durationMin = 24 * 60 - startMin + endMin;
    crossesMidnight = true;
  } else {
    durationMin = endMin - startMin;
    crossesMidnight = false;
  }
  if (durationMin <= 0) throw new Error(`Shift "${s.key}" has non-positive duration`);
  return {
    key: s.key,
    name: s.name,
    startMin,
    endMin,
    crossesMidnight,
    durationHours: durationMin / 60,
    requiredCount: Math.max(0, Math.floor(s.requiredCount)),
  };
}

/**
 * Concrete duty interval for a shift starting on `dayDate` (any time that day
 * is fine — the shift start is placed at startMin on that date; for shifts that
 * cross midnight the end lands on the following day).
 */
export function shiftInterval(dayDate: Date, shift: { startMin: number; endMin: number; durationHours: number }): { start: Date; end: Date } {
  const base = midnightOf(dayDate).getTime();
  const start = new Date(base + shift.startMin * 60000);
  const end = new Date(start.getTime() + Math.round(shift.durationHours * HOUR_MS));
  return { start, end };
}

export function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / HOUR_MS;
}

/** Overlap test on two intervals (half-open: touching endpoints do not overlap). */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
