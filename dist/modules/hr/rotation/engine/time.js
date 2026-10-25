"use strict";
/**
 * Time utilities for the scheduling engine.
 *
 * All rest/duration math is done on integer milliseconds so that boundary
 * cases (exactly 24h rest) compare exactly — no floating point drift.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAY_MS = exports.HOUR_MS = void 0;
exports.parseHM = parseHM;
exports.fmtHM = fmtHM;
exports.addHoursToHM = addHoursToHM;
exports.midnightOf = midnightOf;
exports.ymd = ymd;
exports.addDays = addDays;
exports.daysBetween = daysBetween;
exports.resolveShift = resolveShift;
exports.shiftInterval = shiftInterval;
exports.hoursBetween = hoursBetween;
exports.overlaps = overlaps;
exports.HOUR_MS = 3600000;
exports.DAY_MS = 86400000;
/** Parse 'HH:MM' -> minutes since midnight. Throws on invalid input. */
function parseHM(hm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hm || '').trim());
    if (!m)
        throw new Error(`Invalid time "${hm}" (expected HH:MM)`);
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (h > 23 || min > 59)
        throw new Error(`Invalid time "${hm}"`);
    return h * 60 + min;
}
/** minutes since midnight -> 'HH:MM' */
function fmtHM(min) {
    const m = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
/** Add hours (may be fractional) to a 'HH:MM' string, wrapping at 24h. */
function addHoursToHM(hm, hours) {
    return fmtHM(parseHM(hm) + Math.round(hours * 60));
}
/** Midnight (local) of the given date. */
function midnightOf(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
/** 'YYYY-MM-DD' in local time. */
function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function addDays(d, days) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}
/** Whole days between two midnights (b - a), floor. */
function daysBetween(a, b) {
    return Math.round((midnightOf(b).getTime() - midnightOf(a).getTime()) / exports.DAY_MS);
}
/**
 * Resolve a raw shift definition into minutes + duration.
 *
 * Rules (PHASE 5):
 *  - end > start  => same-day shift, duration = end - start
 *  - end < start  => crosses midnight, duration = (24h - start) + end   (18:00 -> 06:00 = 12h, NOT -12h)
 *  - end === start => 24-hour shift (06:00 -> next day 06:00)
 */
function resolveShift(s) {
    const startMin = parseHM(s.startTime);
    const endMin = parseHM(s.endTime);
    let durationMin;
    let crossesMidnight;
    if (endMin === startMin) {
        durationMin = 24 * 60;
        crossesMidnight = true;
    }
    else if (endMin < startMin) {
        durationMin = 24 * 60 - startMin + endMin;
        crossesMidnight = true;
    }
    else {
        durationMin = endMin - startMin;
        crossesMidnight = false;
    }
    if (durationMin <= 0)
        throw new Error(`Shift "${s.key}" has non-positive duration`);
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
function shiftInterval(dayDate, shift) {
    const base = midnightOf(dayDate).getTime();
    const start = new Date(base + shift.startMin * 60000);
    const end = new Date(start.getTime() + Math.round(shift.durationHours * exports.HOUR_MS));
    return { start, end };
}
function hoursBetween(a, b) {
    return (b.getTime() - a.getTime()) / exports.HOUR_MS;
}
/** Overlap test on two intervals (half-open: touching endpoints do not overlap). */
function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
//# sourceMappingURL=time.js.map