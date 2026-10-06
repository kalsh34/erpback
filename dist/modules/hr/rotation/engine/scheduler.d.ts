/**
 * Constraint-based scheduler with fairness optimization.
 *
 * Priority hierarchy (PHASE 38):
 *   1 valid data -> 2 coverage -> 3 availability -> 4 no overlap ->
 *   5 required rest (hard) -> 6 fair workload -> 7 fair day/night ->
 *   8 minimize consecutive work -> 9 preferences
 *
 * Strategy (PHASE 14):
 *   STAGE 1  validate configuration
 *   STAGE 2  build the base sequence (coverage by construction)
 *   STAGE 3  seed every day from baseSequence[(d - i) mod N]
 *   STAGE 4  build guard state from previous/external duties + leave
 *   STAGE 5  constraint-repair pass (reassign / mutual swap; else controlled conflict)
 *   STAGE 6  fairness passes (only when repairs disturbed the equal-cycle pattern)
 *   STAGE 7  independent validation (validator.ts)
 *   STAGE 8  statistics
 *   STAGE 9  conflict assembly -> preview
 *
 * Deterministic: no randomness; ties broken by guard id.
 * Never silently violates rest: unfixable cases become explicit conflicts and
 * the schedule is labelled BEST_POSSIBLE instead of FULLY_COMPLIANT.
 */
import { EngineInput, GenerationReport } from './types';
export declare function generateSchedule(input: EngineInput): GenerationReport;
//# sourceMappingURL=scheduler.d.ts.map