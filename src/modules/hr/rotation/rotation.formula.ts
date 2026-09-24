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
export function positiveMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * The rotation formula itself: on day `dayIndex` (d = days since the rotation
 * start date) the guard at pool position `guardIndex` (0..N-1) is assigned
 * baseSequence[(d - guardIndex) mod N].
 */
export function rotationSlotFor(base: RotationSlot[], dayIndex: number, guardIndex: number): RotationSlot {
  return base[positiveMod(dayIndex - guardIndex, base.length)];
}

/**
 * Build the base sequence of length poolSize containing the daily requirement
 * (dayCount Day slots + nightCount Night slots) padded with REST.
 */
export function buildBaseSequence(poolSize: number, dayCount: number, nightCount: number): BaseSequenceResult {
  const N = Math.max(0, Math.floor(poolSize));
  const D = Math.max(0, Math.floor(dayCount));
  const K = Math.max(0, Math.floor(nightCount));

  const sequence: RotationSlot[] = new Array(N).fill('REST');
  if (N === 0 || D + K === 0) {
    return { sequence, unplacedDay: D, unplacedNight: K };
  }

  const occupied = new Set<number>();

  // ── Night slots: evenly spaced (max rest between night duties) ──────────
  let placedNights = 0;
  if (K > 0) {
    const stride = Math.max(1, Math.floor(N / K));
    const start = Math.ceil(N / (D + K + 1)); // leading rests before the first night
    let pos = Math.min(start, N - 1);
    let steps = 0;
    while (placedNights < K && steps < N * 2) {
      if (!occupied.has(pos)) {
        occupied.add(pos);
        sequence[pos] = 'NIGHT';
        placedNights += 1;
        if (placedNights >= K) break;
      }
      pos = (pos + stride) % N;
      steps += 1;
    }
  }

  // ── Day slots: immediately before the last dayCount night positions ─────
  let placedDays = 0;
  const nightPositions: number[] = [];
  for (let p = N - 1; p >= 0 && nightPositions.length < placedNights; p -= 1) {
    if (sequence[p] === 'NIGHT') nightPositions.push(p);
  }
  // nightPositions is descending (latest position first) = "last night first".
  const daysBeforeNights = Math.min(D, nightPositions.length);
  for (let k = 0; k < daysBeforeNights; k += 1) {
    let pos = (nightPositions[k] - 1 + N) % N;
    let steps = 0;
    while (steps < N && occupied.has(pos)) {
      pos = (pos - 1 + N) % N; // scan backwards for the nearest free slot
      steps += 1;
    }
    if (steps < N && !occupied.has(pos)) {
      occupied.add(pos);
      sequence[pos] = 'DAY';
      placedDays += 1;
    }
  }
  // Any remaining day slots (requirement had more days than nights): place
  // them evenly across the still-free positions.
  let remainingDays = D - placedDays;
  if (remainingDays > 0) {
    const stride = Math.max(1, Math.floor(N / Math.max(1, remainingDays)));
    let pos = Math.ceil(N / (D + K + 1)) % N;
    let steps = 0;
    while (remainingDays > 0 && steps < N * 2) {
      if (!occupied.has(pos)) {
        occupied.add(pos);
        sequence[pos] = 'DAY';
        placedDays += 1;
        remainingDays -= 1;
      }
      pos = (pos + stride) % N;
      steps += 1;
    }
  }

  return {
    sequence,
    unplacedDay: D - placedDays,
    unplacedNight: K - placedNights,
  };
}
