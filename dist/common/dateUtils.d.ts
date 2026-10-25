/**
 * Calendar-date helpers.
 *
 * Attendance and shift-assignment dates are calendar dates (YYYY-MM-DD), not
 * instants. Parsing 'YYYY-MM-DD' with `new Date()` yields UTC midnight; in
 * UTC+ timezones that is still "yesterday" when formatted via toISOString().
 * Always parse/format through these helpers so 2026-09-01 stays 2026-09-01.
 */
/** Parse 'YYYY-MM-DD' as local midnight. Returns null if invalid. */
export declare function parseYmdLocal(s: string): Date | null;
/** Parse 'YYYY-MM-DD' or ISO timestamp → local midnight of its calendar day. */
export declare function toLocalMidnight(input: string | Date): Date;
/** Format a Date as local 'YYYY-MM-DD' (never use toISOString().split). */
export declare function ymdLocal(d: Date): string;
/** Inclusive day end (23:59:59.999 local) for range queries. */
export declare function endOfLocalDay(d: Date): Date;
/** Next local midnight after d (exclusive upper bound for a calendar day). */
export declare function nextLocalMidnight(d: Date): Date;
export declare const MONTH_NAMES: string[];
/**
 * Payroll period calendar: a period labeled (year, month) runs from the 26th
 * of the PREVIOUS month through the 25th of `month` (inclusive), e.g.
 * October 2026 → 2026-09-26 00:00 … 2026-10-25 23:59:59.999 (local).
 */
export declare function payrollPeriodRange(year: number, month: number): {
    startDate: Date;
    endDate: Date;
};
/**
 * The payroll period (year, month) containing this calendar day:
 * days 1–25 → that month; days 26–31 → the NEXT month (with year rollover).
 * Used for date-aware lock gating: a day on the 28th is governed by the
 * payroll period that ends on the 25th of that month's successor.
 */
export declare function payrollPeriodKeyForDate(d: Date): {
    year: number;
    month: number;
};
//# sourceMappingURL=dateUtils.d.ts.map