/**
 * Ethiopian calendar → Gregorian conversion.
 *
 * Algorithm (deterministic, no JDN arithmetic):
 *  - The Ethiopian new year (Meskerem 1) falls on Gregorian September 11,
 *    except in the Gregorian year preceding a leap year, where it is
 *    September 12.
 *  - Months 1–12 have 30 days; Pagumē (month 13) has 5 days, or 6 when the
 *    Ethiopian year (in Ethiopic numeration, e.g. 2015 EC) is divisible by 4.
 *  - Any date is simply the new year of that year + 30*(month-1) + (day-1).
 *
 * The workbook writes months as 1..13 (Tikimt=2 … Pagumē=13): "9/1/13" is
 * Meskerem 1, 2013 EC = 11 September 2020 Gregorian.
 */
/** Days in Pagumē of Ethiopian year ey. */
export declare function ethiopianMonthLength(ey: number, month: number): number;
/** Convert an Ethiopian date (numeric year, month 1..13, day) to Gregorian UTC. */
export declare function ethiopicToGregorianDate(year: number, month: number, day: number): Date | null;
/**
 * Parse a workbook date string of the shape m/d/yy(yy). Month/day order in
 * this file is month/day/year ("30/02/17" = day 30 of Tikimt, 2017 EC —
 * Tikimt has 30 days, so that is valid).
 */
export declare function parseEthiopianDate(value: string): Date | null;
/** ISO yyyy-mm-dd, or null. */
export declare function ethiopianToIso(value: string): string | null;
/**
 * Sample renderer for the import option: convert up to 3 example strings so
 * the operator can eyeball the calendar before committing.
 */
export declare function sampleConversions(samples: string[]): {
    source: string;
    gregorian: string | null;
}[];
//# sourceMappingURL=ethiopianDate.d.ts.map