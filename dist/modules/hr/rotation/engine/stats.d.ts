/**
 * Statistics for preview and dashboard: coverage %, rest compliance,
 * fairness index, staffing estimate, per-guard workload.
 */
import { Cell, DutyInterval, GuardCtx, RestRule, ShiftDef, StatsReport } from './types';
export interface StatsInput {
    cells: Cell[];
    pool: GuardCtx[];
    shifts: ShiftDef[];
    restRules: RestRule[];
    startDate: Date;
    days: number;
    externalDuties: DutyInterval[];
    nameById: Map<string, string>;
    unplaced: Record<string, number>;
}
export declare function buildStats(input: StatsInput): StatsReport;
//# sourceMappingURL=stats.d.ts.map