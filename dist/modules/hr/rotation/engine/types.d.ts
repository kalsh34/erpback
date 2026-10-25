/**
 * Pure scheduling engine types. No mongoose, no I/O — unit-testable in isolation.
 */
export interface ShiftDefInput {
    key: string;
    name: string;
    startTime: string;
    endTime: string;
    requiredCount: number;
}
/** Resolved shift with pre-computed minutes/duration. */
export interface ShiftDef {
    key: string;
    name: string;
    startMin: number;
    endMin: number;
    crossesMidnight: boolean;
    durationHours: number;
    requiredCount: number;
}
export interface RestRule {
    maxShiftHours: number;
    minRestHours: number;
}
export interface GuardCtx {
    id: string;
    name: string;
    code?: string;
    order: number;
    status: string;
    category?: string;
}
/** A duty interval anywhere in time (other rotations, manual shifts, attendance). */
export interface DutyInterval {
    guardId: string;
    start: Date;
    end: Date;
    siteId?: string;
    label?: string;
    source?: string;
}
export interface LeaveWindow {
    guardId: string;
    start: Date;
    end: Date;
}
export interface EngineInput {
    shifts: ShiftDefInput[];
    restRules: RestRule[];
    pool: GuardCtx[];
    startDate: Date;
    days: number;
    /** Duties for pool guards from ANY source/site, including before the period (for rest seeding). */
    externalDuties: DutyInterval[];
    /** Declared absence windows (rotation leave coverages). */
    leaveWindows: LeaveWindow[];
    /** Employee.status === 'ON_LEAVE'. */
    onLeaveGuards: string[];
}
export interface Cell {
    guardId: string;
    dayIndex: number;
    date: string;
    shiftKey: string;
    shiftName: string;
    slotIndex: number;
    startAt: Date;
    endAt: Date;
}
export type ConflictSeverity = 'CRITICAL' | 'REST' | 'STAFFING' | 'INFO';
export interface ConflictIssue {
    id: string;
    severity: ConflictSeverity;
    code: 'COVERAGE_SHORTAGE' | 'REST_VIOLATION' | 'OVERLAP' | 'ON_LEAVE' | 'STAFFING_WARNING' | 'NIGHT_IMBALANCE' | 'INVALID_GUARD' | 'CONFIG';
    title: string;
    message: string;
    guardId?: string;
    guardName?: string;
    dayIndex?: number;
    date?: string;
    shiftKey?: string;
    details?: Record<string, string | number | undefined>;
    suggestions?: string[];
}
export interface GuardWorkload {
    guardId: string;
    name: string;
    code: string;
    hours: number;
    shifts: number;
    restDays: number;
    byShift: Record<string, number>;
    dayShifts: number;
    nightShifts: number;
    longestRestHours: number | null;
    shortestRestHours: number | null;
    maxConsecutive: number;
}
export interface CoverageShiftStat {
    key: string;
    name: string;
    requiredPerDay: number;
    assignedPerDayAvg: number;
    pct: number;
    shortageDays: number;
}
export interface RestViolationStat {
    guardId: string;
    guardName: string;
    date: string;
    shiftKey: string;
    requiredHours: number;
    actualHours: number;
    previousEnd: string;
    assignedStart: string;
}
export interface StatsReport {
    days: number;
    poolSize: number;
    totalSlotsPerDay: number;
    totalAssignments: number;
    totalHours: number;
    coverage: {
        overallPct: number;
        byShift: CoverageShiftStat[];
        shortageDayCount: number;
    };
    rest: {
        dutyIntervals: number;
        compliantIntervals: number;
        compliancePct: number;
        violations: RestViolationStat[];
    };
    fairness: {
        index: number;
        hourSpread: number;
        nightSpread: number;
        avgHours: number;
    };
    staffing: {
        estimatedMinPool: number;
        currentPool: number;
        recommendedAdditional: number;
        sufficient: boolean;
    };
    workloads: GuardWorkload[];
}
export type Feasibility = 'FULLY_COMPLIANT' | 'BEST_POSSIBLE';
export interface GenerationReport {
    cells: Cell[];
    conflicts: ConflictIssue[];
    stats: StatsReport;
    feasibility: Feasibility;
    warnings: string[];
    algorithmVersion: string;
    rulesFingerprint: string;
}
export declare const ALGORITHM_VERSION = "engine-1.0.0";
export declare class EngineConfigError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=types.d.ts.map