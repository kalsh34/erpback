/**
 * Independent validator — re-checks a finished schedule from scratch.
 * Does NOT trust the scheduler: recomputes coverage, overlaps, leave and
 * timestamp-based rest from the raw cell list + external duties.
 */
import { Cell, ConflictIssue, DutyInterval, GuardCtx, LeaveWindow, RestRule, ShiftDef } from './types';
export interface ValidateInput {
    cells: Cell[];
    pool: GuardCtx[];
    shifts: ShiftDef[];
    restRules: RestRule[];
    startDate: Date;
    days: number;
    externalDuties: DutyInterval[];
    leaveWindows: LeaveWindow[];
    onLeaveGuards: string[];
}
export interface ValidationResult {
    ok: boolean;
    issues: string[];
    conflicts: ConflictIssue[];
}
export declare function validateCells(input: ValidateInput, nameById: Map<string, string>): ValidationResult;
//# sourceMappingURL=validator.d.ts.map