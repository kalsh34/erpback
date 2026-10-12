export interface AssignmentInterval {
  _id?: unknown;
  isPrimary?: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

/** Assignment dates are inclusive UTC calendar dates; isCurrent is not historical evidence. */
export const assignmentDay = (date: Date) => date.toISOString().slice(0, 10);

export function intersectsPeriod(row: AssignmentInterval, start: Date, end: Date): boolean {
  return assignmentDay(row.effectiveFrom) <= assignmentDay(end) &&
    (!row.effectiveTo || assignmentDay(row.effectiveTo) >= assignmentDay(start));
}

export function primaryOverlaps(rows: AssignmentInterval[]): string[][] {
  const primary = rows.filter((r) => r.isPrimary);
  const pairs: string[][] = [];
  for (let i = 0; i < primary.length; i++) {
    for (let j = i + 1; j < primary.length; j++) {
      if (intersectsPeriod(primary[i], primary[j].effectiveFrom, primary[j].effectiveTo || new Date('9999-12-31'))) {
        pairs.push([String(primary[i]._id), String(primary[j]._id)]);
      }
    }
  }
  return pairs;
}

/** Monthly site aggregates cannot apportion a mid-period primary role change safely. */
export function resolveMonthlyPrimary<T extends AssignmentInterval>(rows: T[], start: Date, end: Date):
  { assignment?: T; code?: string; message?: string } {
  const primary = rows.filter((r) => r.isPrimary && intersectsPeriod(r, start, end));
  if (!primary.length) return { code: 'NO_PRIMARY_SITE', message: 'No primary site is effective in this payroll period. Correct the assignment history before calculating.' };
  const overlaps = primaryOverlaps(primary);
  if (overlaps.length) return {
    code: 'MULTIPLE_PRIMARY_SITES',
    message: `Primary assignments overlap: ${overlaps.map((pair) => pair.join(' / ')).join('; ')}. Correct their effective dates or roles; payroll is blocked.`,
  };
  if (primary.length > 1) return { code: 'PRIMARY_SITE_CHANGE', message: 'The primary site changes within this month. Monthly totals cannot allocate primary earnings safely; dated/segmented payroll support is required.' };
  return { assignment: primary[0] };
}
