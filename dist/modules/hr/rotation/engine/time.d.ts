/**
 * Time utilities for the scheduling engine.
 *
 * All rest/duration math is done on integer milliseconds so that boundary
 * cases (exactly 24h rest) compare exactly — no floating point drift.
 */
import { ShiftDef, ShiftDefInput } from './types';
export declare const HOUR_MS = 3600000;
export declare const DAY_MS = 86400000;
/** Parse 'HH:MM' -> minutes since midnight. Throws on invalid input. */
export declare function parseHM(hm: string): number;
/** minutes since midnight -> 'HH:MM' */
export declare function fmtHM(min: number): string;
/** Add hours (may be fractional) to a 'HH:MM' string, wrapping at 24h. */
export declare function addHoursToHM(hm: string, hours: number): string;
/** Midnight (local) of the given date. */
export declare function midnightOf(d: Date): Date;
/** 'YYYY-MM-DD' in local time. */
export declare function ymd(d: Date): string;
export declare function addDays(d: Date, days: number): Date;
/** Whole days between two midnights (b - a), floor. */
export declare function daysBetween(a: Date, b: Date): number;
/**
 * Resolve a raw shift definition into minutes + duration.
 *
 * Rules (PHASE 5):
 *  - end > start  => same-day shift, duration = end - start
 *  - end < start  => crosses midnight, duration = (24h - start) + end   (18:00 -> 06:00 = 12h, NOT -12h)
 *  - end === start => 24-hour shift (06:00 -> next day 06:00)
 */
export declare function resolveShift(s: ShiftDefInput): ShiftDef;
/**
 * Concrete duty interval for a shift starting on `dayDate` (any time that day
 * is fine — the shift start is placed at startMin on that date; for shifts that
 * cross midnight the end lands on the following day).
 */
export declare function shiftInterval(dayDate: Date, shift: {
    startMin: number;
    endMin: number;
    durationHours: number;
}): {
    start: Date;
    end: Date;
};
export declare function hoursBetween(a: Date, b: Date): number;
/** Overlap test on two intervals (half-open: touching endpoints do not overlap). */
export declare function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean;
//# sourceMappingURL=time.d.ts.map