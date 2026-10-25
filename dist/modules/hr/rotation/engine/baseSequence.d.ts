/**
 * Generalized base sequence builder.
 *
 * The proven company rule (validated cell-for-cell against the real Denmark
 * Embassy 6-guard schedule):
 *
 *   1. Build ONE base sequence of length N (pool size) holding the daily
 *      requirement (every shift's slots) padded with REST.
 *   2. Guards are numbered 0..N-1 in fixed pool order.
 *   3. On day d, guard i receives baseSequence[(d - i) mod N].
 *
 * Because (d - i) mod N is a bijection over i for every fixed d, every base
 * position is filled by exactly one guard every day — coverage falls out of
 * the formula — and every guard walks the ENTIRE sequence (all shift types and
 * rest) over N days, so no static teams can emerge.
 *
 * Base layout: shift types are placed in descending slot-count order (ties keep
 * the given order), each type spread as evenly as possible with a per-type
 * staggered start. For the company's real case (N=6, 1 Day + 2 Night) this
 * yields exactly [REST, REST, NIGHT, REST, DAY, NIGHT].
 */
export type SlotToken = string;
export interface SlotSpec {
    key: string;
    count: number;
}
export interface BaseSequenceResult {
    sequence: SlotToken[];
    /** Slots that could not be placed because the pool is smaller than the requirement. */
    unplaced: Record<string, number>;
}
export declare const REST = "REST";
/** Positive modulo — ((n % m) + m) % m. */
export declare function positiveMod(n: number, m: number): number;
/** The rotation formula: baseSequence[(d - i) mod N]. */
export declare function slotFor(base: SlotToken[], dayIndex: number, guardIndex: number): SlotToken;
export declare function buildBaseSequenceFromSlots(poolSize: number, specs: SlotSpec[]): BaseSequenceResult;
//# sourceMappingURL=baseSequence.d.ts.map