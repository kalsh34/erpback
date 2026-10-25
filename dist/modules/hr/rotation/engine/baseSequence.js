"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.REST = void 0;
exports.positiveMod = positiveMod;
exports.slotFor = slotFor;
exports.buildBaseSequenceFromSlots = buildBaseSequenceFromSlots;
exports.REST = 'REST';
/** Positive modulo — ((n % m) + m) % m. */
function positiveMod(n, m) {
    return ((n % m) + m) % m;
}
/** The rotation formula: baseSequence[(d - i) mod N]. */
function slotFor(base, dayIndex, guardIndex) {
    return base[positiveMod(dayIndex - guardIndex, base.length)];
}
function buildBaseSequenceFromSlots(poolSize, specs) {
    const N = Math.max(0, Math.floor(poolSize));
    const sequence = new Array(N).fill(exports.REST);
    const unplaced = {};
    const active = specs.filter((s) => s.count > 0);
    const totalSlots = active.reduce((sum, s) => sum + s.count, 0);
    if (N === 0 || totalSlots === 0) {
        for (const s of active)
            unplaced[s.key] = s.count;
        return { sequence, unplaced };
    }
    // Descending count, stable within equal counts (ties keep the given order).
    const ordered = active
        .map((s, idx) => ({ ...s, idx }))
        .sort((a, b) => b.count - a.count || a.idx - b.idx);
    const occupied = new Set();
    const baseStart = Math.ceil(N / (totalSlots + 1)); // leading rests before first slot
    ordered.forEach((spec, orderIdx) => {
        let placed = 0;
        const stride = Math.max(1, Math.floor(N / spec.count));
        // Per-type staggered start keeps different types from colliding.
        const stagger = orderIdx === 0 ? 0 : orderIdx * Math.max(1, Math.ceil(N / (ordered.length + 1)));
        let pos = (baseStart + stagger) % N;
        let steps = 0;
        while (placed < spec.count && steps < N * 4) {
            if (!occupied.has(pos)) {
                occupied.add(pos);
                sequence[pos] = spec.key;
                placed += 1;
                if (placed >= spec.count)
                    break;
            }
            pos = (pos + stride) % N;
            steps += 1;
            // stride of 1 guarantees eventual coverage of every position
            if (stride === 1 && occupied.size >= N)
                break;
        }
        // Probe linearly for any remaining slots if stride cycling missed spots.
        if (placed < spec.count) {
            for (let p = 0; p < N && placed < spec.count; p++) {
                if (!occupied.has(p)) {
                    occupied.add(p);
                    sequence[p] = spec.key;
                    placed += 1;
                }
            }
        }
        if (placed < spec.count)
            unplaced[spec.key] = spec.count - placed;
    });
    return { sequence, unplaced };
}
//# sourceMappingURL=baseSequence.js.map