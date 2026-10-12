"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignmentDay = void 0;
exports.intersectsPeriod = intersectsPeriod;
exports.primaryOverlaps = primaryOverlaps;
exports.resolveMonthlyPrimary = resolveMonthlyPrimary;
/** Assignment dates are inclusive UTC calendar dates; isCurrent is not historical evidence. */
const assignmentDay = (date) => date.toISOString().slice(0, 10);
exports.assignmentDay = assignmentDay;
function intersectsPeriod(row, start, end) {
    return (0, exports.assignmentDay)(row.effectiveFrom) <= (0, exports.assignmentDay)(end) &&
        (!row.effectiveTo || (0, exports.assignmentDay)(row.effectiveTo) >= (0, exports.assignmentDay)(start));
}
function primaryOverlaps(rows) {
    const primary = rows.filter((r) => r.isPrimary);
    const pairs = [];
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
function resolveMonthlyPrimary(rows, start, end) {
    const primary = rows.filter((r) => r.isPrimary && intersectsPeriod(r, start, end));
    if (!primary.length)
        return { code: 'NO_PRIMARY_SITE', message: 'No primary site is effective in this payroll period. Correct the assignment history before calculating.' };
    const overlaps = primaryOverlaps(primary);
    if (overlaps.length)
        return {
            code: 'MULTIPLE_PRIMARY_SITES',
            message: `Primary assignments overlap: ${overlaps.map((pair) => pair.join(' / ')).join('; ')}. Correct their effective dates or roles; payroll is blocked.`,
        };
    if (primary.length > 1)
        return { code: 'PRIMARY_SITE_CHANGE', message: 'The primary site changes within this month. Monthly totals cannot allocate primary earnings safely; dated/segmented payroll support is required.' };
    return { assignment: primary[0] };
}
//# sourceMappingURL=assignmentTimeline.js.map