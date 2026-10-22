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

/** Full Gregorian leap rule (also correct for 1900 and 2100). */
function isGregorianLeap(year: number): boolean {
  if (year % 4 !== 0) return false;
  if (year % 100 !== 0) return true;
  return year % 400 === 0;
}

function ethiopianIsLeap(ey: number): boolean {
  return ey % 4 === 0;
}

/** Gregorian UTC date of Meskerem 1 of Ethiopian year ey. */
function newYearGregorian(ey: number): Date {
  const gregorianYear = ey + 7;
  // Meskerem 1 falls on Sep 12 when the Gregorian year that the new year
  // STARTS IN is a leap year's eve (i.e. the FOLLOWING Gregorian year is leap).
  const followingGregorianIsLeap = isGregorianLeap(gregorianYear + 1);
  return new Date(Date.UTC(gregorianYear, 8, followingGregorianIsLeap ? 12 : 11));
}

/** Days in Pagumē of Ethiopian year ey. */
export function ethiopianMonthLength(ey: number, month: number): number {
  if (month >= 1 && month <= 12) return 30;
  if (month === 13) return ethiopianIsLeap(ey) ? 6 : 5;
  return 0;
}

/** Convert an Ethiopian date (numeric year, month 1..13, day) to Gregorian UTC. */
export function ethiopicToGregorianDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  // Amharic workbooks write two- or three-year suffixes ("13" = 2013 EC).
  const fullYear = year < 100 ? 2000 + year : year;
  if (month < 1 || month > 13 || day < 1) return null;
  if (day > ethiopianMonthLength(fullYear, month)) return null;
  if (fullYear < 1900 || fullYear > 2200) return null;
  const ny = newYearGregorian(fullYear);
  const offset = 30 * (month - 1) + (day - 1);
  return new Date(ny.getTime() + offset * 86400000);
}

/**
 * Parse a workbook date string of the shape m/d/yy(yy). Month/day order in
 * this file is month/day/year ("30/02/17" = day 30 of Tikimt, 2017 EC —
 * Tikimt has 30 days, so that is valid).
 */
export function parseEthiopianDate(value: string): Date | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const m = /^(\d{1,2})[\s/.-](\d{1,2})[\s/.-](\d{2,4})$/.exec(text);
  if (!m) return null;
  // The workbook writes day/month/year: "9/1/13" = day 9 of Meskerem (month 1);
  // "30/02/17" = day 30 of Tikimt (month 2) — month-first would give months
  // 21, 29 and 30, which do not exist.
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  return ethiopicToGregorianDate(year, month, day);
}

/** ISO yyyy-mm-dd, or null. */
export function ethiopianToIso(value: string): string | null {
  const d = parseEthiopianDate(value);
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Sample renderer for the import option: convert up to 3 example strings so
 * the operator can eyeball the calendar before committing.
 */
export function sampleConversions(samples: string[]): { source: string; gregorian: string | null }[] {
  return samples.map((s) => ({ source: s, gregorian: ethiopianToIso(s) }));
}
