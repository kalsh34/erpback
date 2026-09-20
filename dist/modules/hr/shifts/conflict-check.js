"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiftsTimeOverlap = shiftsTimeOverlap;
exports.checkCrossSiteConflict = checkCrossSiteConflict;
exports.checkCrossSiteConflictForRotation = checkCrossSiteConflictForRotation;
const ShiftAssignment_1 = require("../../../models/ShiftAssignment");
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
}
function getCoverageIntervals(start, end) {
    const s = timeToMinutes(start);
    const e = timeToMinutes(end);
    if (e > s)
        return [[s, e]];
    return [[s, 24 * 60], [0, e]];
}
function intervalsOverlap(a, b) {
    return a[0] <= b[1] && b[0] <= a[1];
}
function shiftsTimeOverlap(aStart, aEnd, bStart, bEnd) {
    const aIntervals = getCoverageIntervals(aStart, aEnd);
    const bIntervals = getCoverageIntervals(bStart, bEnd);
    for (const a of aIntervals) {
        for (const b of bIntervals) {
            if (intervalsOverlap(a, b))
                return true;
        }
    }
    return false;
}
function dateRangesOverlap(startA, endA, startB, endB) {
    const aEnd = endA && endA.getTime() > 0 ? endA : new Date('2099-12-31');
    const bEnd = endB && endB.getTime() > 0 ? endB : new Date('2099-12-31');
    return startA < bEnd && startB < aEnd;
}
async function checkCrossSiteConflict(guardId, newStartDate, newEndDate, newShiftStart, newShiftEnd, excludeAssignmentId) {
    const existing = await ShiftAssignment_1.ShiftAssignment.find({
        guardId,
        status: 'ACTIVE',
        _id: { $ne: excludeAssignmentId },
    }).populate('siteId', 'siteName siteCode').populate('shiftTemplateId', 'name startTime endTime');
    for (const assignment of existing) {
        if (!dateRangesOverlap(newStartDate, newEndDate, assignment.startDate, assignment.endDate))
            continue;
        const template = assignment.shiftTemplateId;
        if (!template)
            continue;
        const existStart = template.startTime;
        const existEnd = template.endTime;
        if (shiftsTimeOverlap(newShiftStart, newShiftEnd, existStart, existEnd)) {
            const site = assignment.siteId;
            return {
                hasConflict: true,
                conflictingSite: site?.siteName || 'Unknown',
                conflictingSiteCode: site?.siteCode || '',
                conflictingShift: template.name || 'Unknown',
                conflictingTimes: `${existStart}-${existEnd}`,
                message: `Conflicts with existing shift "${template.name}" (${existStart}-${existEnd}) at ${site?.siteName || 'another site'}`,
            };
        }
    }
    return { hasConflict: false };
}
async function checkCrossSiteConflictForRotation(guardId, date, shiftType, dayStartTime, dayEndTime, nightStartTime, nightEndTime, excludeRotationId) {
    const shiftStart = shiftType === 'DAY' ? dayStartTime : nightStartTime;
    const shiftEnd = shiftType === 'DAY' ? dayEndTime : nightEndTime;
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const existing = await ShiftAssignment_1.ShiftAssignment.find({
        guardId,
        status: 'ACTIVE',
    }).populate('siteId', 'siteName siteCode').populate('shiftTemplateId', 'name startTime endTime');
    for (const assignment of existing) {
        if (!dateRangesOverlap(date, dayEnd, assignment.startDate, assignment.endDate))
            continue;
        if (excludeRotationId && assignment.rotationId?.toString() === excludeRotationId)
            continue;
        const template = assignment.shiftTemplateId;
        if (!template)
            continue;
        const existStart = template.startTime;
        const existEnd = template.endTime;
        if (shiftsTimeOverlap(shiftStart, shiftEnd, existStart, existEnd)) {
            const site = assignment.siteId;
            return {
                hasConflict: true,
                conflictingSite: site?.siteName || 'Unknown',
                conflictingSiteCode: site?.siteCode || '',
                conflictingShift: template.name || 'Unknown',
                conflictingTimes: `${existStart}-${existEnd}`,
                message: `Guard already assigned to "${template.name}" (${existStart}-${existEnd}) at ${site?.siteName || 'another site'} on this date`,
            };
        }
    }
    return { hasConflict: false };
}
//# sourceMappingURL=conflict-check.js.map