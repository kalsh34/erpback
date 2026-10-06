"use strict";
/**
 * Calendar-date helpers.
 *
 * Attendance and shift-assignment dates are calendar dates (YYYY-MM-DD), not
 * instants. Parsing 'YYYY-MM-DD' with `new Date()` yields UTC midnight; in
 * UTC+ timezones that is still "yesterday" when formatted via toISOString().
 * Always parse/format through these helpers so 2026-09-01 stays 2026-09-01.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONTH_NAMES = void 0;
exports.parseYmdLocal = parseYmdLocal;
exports.toLocalMidnight = toLocalMidnight;
exports.ymdLocal = ymdLocal;
exports.endOfLocalDay = endOfLocalDay;
exports.nextLocalMidnight = nextLocalMidnight;
exports.payrollPeriodRange = payrollPeriodRange;
exports.payrollPeriodKeyForDate = payrollPeriodKeyForDate;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Parse 'YYYY-MM-DD' as local midnight. Returns null if invalid. */
function parseYmdLocal(s) {
    const m = YMD_RE.exec(String(s ?? '').trim());
    if (!m)
        return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31)
        return null;
    const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
    // Reject overflow (e.g. 2026-02-31 → Mar 3)
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d)
        return null;
    return date;
}
/** Parse 'YYYY-MM-DD' or ISO timestamp → local midnight of its calendar day. */
function toLocalMidnight(input) {
    if (input instanceof Date) {
        const x = new Date(input);
        x.setHours(0, 0, 0, 0);
        return x;
    }
    const s = String(input ?? '').trim();
    const ymd = parseYmdLocal(s);
    if (ymd)
        return ymd;
    // Fallback for full ISO strings: use local calendar components
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
        throw new Error(`Invalid date "${s}" (expected YYYY-MM-DD)`);
    }
    d.setHours(0, 0, 0, 0);
    return d;
}
/** Format a Date as local 'YYYY-MM-DD' (never use toISOString().split). */
function ymdLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
/** Inclusive day end (23:59:59.999 local) for range queries. */
function endOfLocalDay(d) {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
}
/** Next local midnight after d (exclusive upper bound for a calendar day). */
function nextLocalMidnight(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() + 1);
    return x;
}
exports.MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
/**
 * Payroll period calendar: a period labeled (year, month) runs from the 26th
 * of the PREVIOUS month through the 25th of `month` (inclusive), e.g.
 * October 2026 → 2026-09-26 00:00 … 2026-10-25 23:59:59.999 (local).
 */
function payrollPeriodRange(year, month) {
    const startYear = month === 1 ? year - 1 : year;
    const startMonth = month === 1 ? 12 : month - 1;
    const startDate = new Date(startYear, startMonth - 1, 26, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, 25, 23, 59, 59, 999);
    return { startDate, endDate };
}
/**
 * The payroll period (year, month) containing this calendar day:
 * days 1–25 → that month; days 26–31 → the NEXT month (with year rollover).
 * Used for date-aware lock gating: a day on the 28th is governed by the
 * payroll period that ends on the 25th of that month's successor.
 */
function payrollPeriodKeyForDate(d) {
    if (d.getDate() >= 26) {
        // Next month, 1-based (d.getMonth() is 0-based): Oct(9)+2 = 11 = November.
        const m = d.getMonth() + 2;
        return m > 12 ? { year: d.getFullYear() + 1, month: m - 12 } : { year: d.getFullYear(), month: m };
    }
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
//# sourceMappingURL=dateUtils.js.map