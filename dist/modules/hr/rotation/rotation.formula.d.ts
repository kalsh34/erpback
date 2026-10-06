/**
 * THE rotation formula — implemented exactly as derived from the company's real
 * schedule data (the "Denmark Embassy" 6-guard schedule).
 *
 *   1. Build ONE base sequence of length N (N = guard pool size) containing the
 *      site's daily requirement (Day slots + Night slots) padded with REST.
 *   2. Number the guards in the pool 0..N-1 in a fixed order (pool `order`).
 *   3. On day d (days since the rotation's start date), guard i is assigned
 *      baseSequence[(d - i) mod N]   (always positive modulo).
 *
 * Why this is correct: on any day d, as i ranges over 0..N-1 the expression
 * (d - i) mod N takes every value 0..N-1 exactly once — so every base position
 * is filled by exactly one guard and daily coverage falls out of the formula
 * for free. Each guard walks the ENTIRE sequence over N days (Day, Night AND
 * Rest), so there are no static shift-type teams.
 *
 * Base-sequence layout (fixed once chosen, mirrors the company template):
 *   - NIGHT slots are spread as evenly as possible: positions s + k*stride with
 *     stride = floor(N / nightCount) and s = ceil(N / (day+night+1)) leading
 *     rests. Even night spacing maximises the rest between night duties.
 *   - DAY slots sit immediately BEFORE the last dayCount night positions (the
 *     day guard hands the post over to the night shift that follows).
 *   - Everything else is REST.
 * For the company's real case (1 Day + 2 Night, 6 guards) this produces
 * [REST, REST, NIGHT, REST, DAY, NIGHT] — exactly the base sequence of the
 * real schedule, which the rotation formula then reproduces cell for cell.
 *
 * Pure and DB-free — unit-testable (see rotation.validate.ts).
 */
export type RotationSlot = 'DAY' | 'NIGHT' | 'REST';
export interface BaseSequenceResult {
    sequence: RotationSlot[];
    /** Day slots that did not fit because the pool is smaller than the requirement. */
    unplacedDay: number;
    /** Night slots that did not fit because the pool is smaller than the requirement. */
    unplacedNight: number;
}
/** Positive modulo — ((n % m) + m) % m — so negative day indices wrap correctly. */
export declare function positiveMod(n: number, m: number): number;
/**
 * The rotation formula itself: on day `dayIndex` (d = days since the rotation
 * start date) the guard at pool position `guardIndex` (0..N-1) is assigned
 * baseSequence[(d - guardIndex) mod N].
 */
export declare function rotationSlotFor(base: RotationSlot[], dayIndex: number, guardIndex: number): RotationSlot;
/**
 * Build the base sequence of length poolSize containing the daily requirement
 * (dayCount Day slots + nightCount Night slots) padded with REST.
 */
export declare function buildBaseSequence(poolSize: number, dayCount: number, nightCount: number): BaseSequenceResult;
//# sourceMappingURL=rotation.formula.d.ts.map