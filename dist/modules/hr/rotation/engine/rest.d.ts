/**
 * Configurable rest (recovery) rules.
 *
 * Defaults (PHASE 6/7):  12h shift -> 24h rest,  24h shift -> 48h rest.
 * Rest is computed from TIMESTAMPS, never from calendar dates.
 *
 * Lookup: first rule whose maxShiftHours >= shift duration wins (rules are
 * sorted ascending). If no configured rule covers the duration, rest scales at
 * 2x the shift duration (with a 24h floor for shifts <= 12h) so unusual custom
 * shifts still get a sane recovery target.
 */
import { RestRule } from './types';
export declare const DEFAULT_REST_RULES: RestRule[];
export declare function normalizeRestRules(rules?: RestRule[] | null): RestRule[];
/** Minimum rest (in hours) required after a shift of `durationHours`. */
export declare function minRestHoursAfter(durationHours: number, rules: RestRule[]): number;
export declare function minRestMsAfter(durationHours: number, rules: RestRule[]): number;
/**
 * Stable fingerprint of the scheduling rules — stored with every generation so
 * a historical rotation can always explain which rule set produced it
 * (PHASE 7: changing a rule must not silently alter published rotations).
 */
export declare function rulesFingerprint(shiftsJson: string, rules: RestRule[]): string;
//# sourceMappingURL=rest.d.ts.map