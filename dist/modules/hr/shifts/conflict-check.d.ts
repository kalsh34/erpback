export declare function shiftsTimeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean;
export interface ConflictResult {
    hasConflict: boolean;
    conflictingSite?: string;
    conflictingSiteCode?: string;
    conflictingShift?: string;
    conflictingTimes?: string;
    message?: string;
}
export declare function checkCrossSiteConflict(guardId: string, newStartDate: Date, newEndDate: Date | undefined | null, newShiftStart: string, newShiftEnd: string, excludeAssignmentId?: string): Promise<ConflictResult>;
export declare function checkCrossSiteConflictForRotation(guardId: string, date: Date, shiftType: 'DAY' | 'NIGHT', dayStartTime: string, dayEndTime: string, nightStartTime: string, nightEndTime: string, excludeRotationId?: string): Promise<ConflictResult>;
//# sourceMappingURL=conflict-check.d.ts.map