export interface AssignmentInterval {
    _id?: unknown;
    isPrimary?: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
}
/** Assignment dates are inclusive UTC calendar dates; isCurrent is not historical evidence. */
export declare const assignmentDay: (date: Date) => string;
export declare function intersectsPeriod(row: AssignmentInterval, start: Date, end: Date): boolean;
export declare function primaryOverlaps(rows: AssignmentInterval[]): string[][];
/** Monthly site aggregates cannot apportion a mid-period primary role change safely. */
export declare function resolveMonthlyPrimary<T extends AssignmentInterval>(rows: T[], start: Date, end: Date): {
    assignment?: T;
    code?: string;
    message?: string;
};
//# sourceMappingURL=assignmentTimeline.d.ts.map