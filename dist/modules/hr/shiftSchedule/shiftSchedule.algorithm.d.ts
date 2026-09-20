/**
 * Shift Scheduling Algorithm (pure, DB-free — unit-testable).
 *
 * Replaces the legacy rotation round-robin with a fair-rest greedy scheduler:
 *
 * Rules implemented (per operations requirement):
 *  1. 12h duty  -> at least 12h rest before the next duty starts.
 *  2. 24h duty  -> at least 48h rest before the next duty starts.
 *  3. Cross-site awareness: every guard carries a global timeline (duties from
 *     OTHER schedules plus manual shift assignments). A guard is never
 *     double-booked (overlap is a HARD constraint) and rest is checked on
 *     BOTH sides of a candidate slot (since last duty ended AND until the
 *     next already-committed duty starts).
 *  4. Fairness: the guard with the FEWEST duties is preferred, then the most
 *     rested, then day/night alternation (nobody gets stuck on nights), then
 *     day/night balance, then stable pool order. With guards A,B,C and one
 *     DAY + one NIGHT slot this produces the classic fair cycle:
 *       d1: A day / B night -> d2: C day / A night -> d3: B day / C night ...
 *  5. Shortage override: when NO guard satisfies the rest rule but someone is
 *     at least overlap-free, the most-rested overlap-free guard is assigned
 *     anyway and the duty is flagged as an override (warning recorded).
 *     If not even that is possible, the slot is reported as uncovered.
 */
export type ShiftMode = 'STANDARD_12H' | 'SINGLE_24H';
export type ShiftType = 'DAY' | 'NIGHT' | 'FULL';
export interface AlgorithmTimeWindow {
    start: Date;
    end: Date;
}
export interface ExternalDuty {
    guardId: string;
    start: Date;
    end: Date;
    /** Where the duty comes from (for warning messages). */
    source?: string;
}
export interface AlgorithmPoolEntry {
    id: string;
    order: number;
}
export interface AlgorithmConfig {
    shiftMode: ShiftMode;
    /** Guards required on the day shift (12h mode) or the 24h duty (24h mode). */
    dayCount: number;
    /** Guards required on the night shift (12h mode only). */
    nightCount: number;
    dayStartTime: string;
    dayEndTime: string;
    nightStartTime: string;
    nightEndTime: string;
    pool: AlgorithmPoolEntry[];
    floaters: AlgorithmPoolEntry[];
    /** Existing duties from other schedules / manual assignments. */
    external: ExternalDuty[];
    /** First day to schedule (00:00 local). */
    from: Date;
    /** Number of days to schedule. */
    days: number;
}
export interface AlgorithmAssignment {
    date: Date;
    guardId: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    startAt: Date;
    endAt: Date;
    isOverride: boolean;
    source: 'POOL' | 'FLOATER';
    /** Actual rest hours before this duty (null = fresh guard / not computed). */
    restHoursBefore: number | null;
}
export interface AlgorithmWarning {
    date: Date;
    shiftType: ShiftType;
    kind: 'OVERRIDE' | 'UNCOVERED';
    message: string;
}
export interface AlgorithmResult {
    assignments: AlgorithmAssignment[];
    warnings: AlgorithmWarning[];
    uncoveredSlots: number;
}
export declare function parseHM(value: string | undefined | null, fallback: string): {
    h: number;
    m: number;
};
export declare function atTime(date: Date, h: number, m: number): Date;
/** Absolute window of a shift slot on a calendar day (night shifts cross midnight). */
export declare function slotWindow(cfg: Pick<AlgorithmConfig, 'shiftMode' | 'dayStartTime' | 'dayEndTime' | 'nightStartTime' | 'nightEndTime'>, date: Date, shiftType: ShiftType): AlgorithmTimeWindow;
/** Required rest after a duty of this kind, in ms (12h work -> 12h rest, 24h work -> 48h rest). */
export declare function requiredRestMs(cfg: Pick<AlgorithmConfig, 'shiftMode'>, window: AlgorithmTimeWindow): number;
/**
 * Build the schedule. Deterministic given (config, external duties).
 * Slots are filled day by day, all DAY slots first, then all NIGHT slots.
 */
export declare function buildSchedule(cfg: AlgorithmConfig): AlgorithmResult;
//# sourceMappingURL=shiftSchedule.algorithm.d.ts.map