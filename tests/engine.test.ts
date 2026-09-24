import { test, expect, expectEq } from './harness';
import {
  parseHM, fmtHM, resolveShift, shiftInterval, hoursBetween, ymd, midnightOf, addDays,
} from '../src/modules/hr/rotation/engine/time';
import {
  DEFAULT_REST_RULES, minRestHoursAfter, normalizeRestRules, rulesFingerprint,
} from '../src/modules/hr/rotation/engine/rest';
import {
  buildBaseSequenceFromSlots, slotFor, positiveMod, REST,
} from '../src/modules/hr/rotation/engine/baseSequence';
import { generateSchedule } from '../src/modules/hr/rotation/engine/scheduler';
import { validateCells } from '../src/modules/hr/rotation/engine/validator';
import { EngineInput, ShiftDefInput, GuardCtx } from '../src/modules/hr/rotation/engine/types';

export function registerTimeTests() {
  test('parseHM parses HH:MM', () => {
    expect(parseHM('06:00') === 360);
    expect(parseHM('18:00') === 1080);
    expect(parseHM('0:00') === 0);
    expect(parseHM('23:59') === 23 * 60 + 59);
  });

  test('parseHM rejects invalid', () => {
    let threw = false;
    try { parseHM('24:00'); } catch { threw = true; }
    expect(threw, '24:00 should throw');
    threw = false;
    try { parseHM('abc'); } catch { threw = true; }
    expect(threw, 'abc should throw');
  });

  test('fmtHM formats minutes', () => {
    expectEq(fmtHM(360), '06:00');
    expectEq(fmtHM(1080), '18:00');
    expectEq(fmtHM(0), '00:00');
    expectEq(fmtHM(1439), '23:59');
  });

  test('resolveShift same-day duration', () => {
    const s = resolveShift({ key: 'DAY', name: 'Day', startTime: '06:00', endTime: '18:00', requiredCount: 1 });
    expectEq(s.durationHours, 12);
    expect(s.crossesMidnight === false);
  });

  test('resolveShift midnight crossing gives positive 12h (not -12)', () => {
    const s = resolveShift({ key: 'NIGHT', name: 'Night', startTime: '18:00', endTime: '06:00', requiredCount: 2 });
    expectEq(s.durationHours, 12, '18:00->06:00 must be +12h');
    expect(s.crossesMidnight === true);
  });

  test('resolveShift equal times => 24h', () => {
    const s = resolveShift({ key: 'F24', name: 'Full', startTime: '06:00', endTime: '06:00', requiredCount: 1 });
    expectEq(s.durationHours, 24);
    expect(s.crossesMidnight === true);
  });

  test('shiftInterval end = start + duration', () => {
    const day = new Date(2026, 0, 1);
    const night = resolveShift({ key: 'N', name: 'N', startTime: '18:00', endTime: '06:00', requiredCount: 1 });
    const iv = shiftInterval(day, night);
    expect(iv.start.getHours() === 18);
    expectEq(ymd(iv.end), '2026-01-02');
    expect(iv.end.getHours() === 6);
    expectEq(hoursBetween(iv.start, iv.end), 12);
  });

  test('rest ladder: 12h->24h, 24h->48h, custom rules respected', () => {
    expectEq(minRestHoursAfter(12, DEFAULT_REST_RULES), 24);
    expectEq(minRestHoursAfter(8, DEFAULT_REST_RULES), 24);
    expectEq(minRestHoursAfter(24, DEFAULT_REST_RULES), 48);
    expectEq(minRestHoursAfter(6, DEFAULT_REST_RULES), 24);

    const custom = normalizeRestRules([
      { maxShiftHours: 8, minRestHours: 16 },
      { maxShiftHours: 12, minRestHours: 30 },
    ]);
    expectEq(minRestHoursAfter(6, custom), 16, 'first covering rule wins');
    expectEq(minRestHoursAfter(12, custom), 30);
    // no rule covers 20h -> floor of duration*2 with 24h min
    expectEq(minRestHoursAfter(20, custom), 40);

    // empty -> defaults
    const def = normalizeRestRules([]);
    expectEq(def.length, DEFAULT_REST_RULES.length);
  });

  test('rulesFingerprint is stable and changes when rules change', () => {
    const a = rulesFingerprint('[{"key":"DAY"}]', DEFAULT_REST_RULES);
    const b = rulesFingerprint('[{"key":"DAY"}]', DEFAULT_REST_RULES);
    const c = rulesFingerprint('[{"key":"DAY"}]', [{ maxShiftHours: 12, minRestHours: 30 }]);
    expectEq(a, b, 'same inputs => same fingerprint');
    expect(a !== c, 'different rules => different fingerprint');
  });

  test('midnightOf / addDays / ymd', () => {
    const d = new Date(2026, 5, 15, 14, 30, 0);
    const m = midnightOf(d);
    expect(m.getHours() === 0 && m.getMinutes() === 0);
    expectEq(ymd(addDays(m, 1)), '2026-06-16');
    expectEq(ymd(addDays(m, -1)), '2026-06-14');
  });
}

export function registerBaseSequenceTests() {
  test('positiveMod handles negatives', () => {
    expectEq(positiveMod(-1, 6), 5);
    expectEq(positiveMod(-6, 6), 0);
    expectEq(positiveMod(7, 6), 1);
  });

  test('6 guards 1D+2N base sequence matches ground truth', () => {
    const { sequence, unplaced } = buildBaseSequenceFromSlots(6, [
      { key: 'DAY', count: 1 },
      { key: 'NIGHT', count: 2 },
    ]);
    expectEq(
      sequence,
      [REST, REST, 'NIGHT', REST, 'DAY', 'NIGHT'],
      'base must be [REST, REST, NIGHT, REST, DAY, NIGHT]',
    );
    expectEq(Object.keys(unplaced).length, 0);
  });

  test('base sequence is a bijection: every day full coverage for pool >= requirement', () => {
    const specs = [
      { key: 'DAY', count: 3 },
      { key: 'NIGHT', count: 4 },
    ];
    const { sequence } = buildBaseSequenceFromSlots(14, specs);
    expectEq(sequence.length, 14);
    const counts: Record<string, number> = {};
    for (const s of sequence) counts[s] = (counts[s] || 0) + 1;
    expectEq(counts['DAY'], 3);
    expectEq(counts['NIGHT'], 4);
    expectEq(counts[REST], 7);

    // For every day d, mapping i -> base[(d-i) mod N] hits every position once
    const N = 14;
    for (let d = 0; d < N; d++) {
      const seen = new Set<number>();
      const dayCounts: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const pos = positiveMod(d - i, N);
        seen.add(pos);
        const tok = sequence[pos];
        dayCounts[tok] = (dayCounts[tok] || 0) + 1;
      }
      expectEq(seen.size, N, `day ${d} must hit every base position`);
      expectEq(dayCounts['DAY'], 3, `day ${d} day coverage`);
      expectEq(dayCounts['NIGHT'], 4, `day ${d} night coverage`);
    }
  });

  test('pool smaller than requirement reports unplaced', () => {
    const { unplaced } = buildBaseSequenceFromSlots(2, [
      { key: 'DAY', count: 1 },
      { key: 'NIGHT', count: 2 },
    ]);
    const totalUnplaced = Object.values(unplaced).reduce((a, b) => a + b, 0);
    expect(totalUnplaced >= 1, `expected unplaced slots, got ${JSON.stringify(unplaced)}`);
  });

  test('slotFor day7 repeats day1 (cycle = pool size)', () => {
    const { sequence } = buildBaseSequenceFromSlots(6, [
      { key: 'DAY', count: 1 },
      { key: 'NIGHT', count: 2 },
    ]);
    for (let i = 0; i < 6; i++) {
      expectEq(slotFor(sequence, 6, i), slotFor(sequence, 0, i), `guard ${i} day6 == day0`);
      expectEq(slotFor(sequence, 7, i), slotFor(sequence, 1, i));
    }
  });
}

function pool(n: number): GuardCtx[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `g${i}`,
    name: `Guard ${i}`,
    code: `G${String(i).padStart(3, '0')}`,
    order: i,
    status: 'ACTIVE',
    category: 'GUARD',
  }));
}

function stdShifts(day = 1, night = 2): ShiftDefInput[] {
  const out: ShiftDefInput[] = [];
  if (day > 0) out.push({ key: 'DAY', name: 'Day Shift', startTime: '06:00', endTime: '18:00', requiredCount: day });
  if (night > 0) out.push({ key: 'NIGHT', name: 'Night Shift', startTime: '18:00', endTime: '06:00', requiredCount: night });
  return out;
}

function baseInput(overrides: Partial<EngineInput> = {}): EngineInput {
  return {
    shifts: stdShifts(),
    restRules: DEFAULT_REST_RULES,
    pool: pool(6),
    startDate: new Date(2026, 0, 1),
    days: 14,
    externalDuties: [],
    leaveWindows: [],
    onLeaveGuards: [],
    ...overrides,
  };
}

export function registerSchedulerTests() {
  test('6-guard ground truth: engine reproduces Denmark Embassy grid', () => {
    const report = generateSchedule(baseInput({ days: 7 }));
    // Expected per guard over days 0..6 (day7 = day1 of next cycle but day6=index6 wraps)
    // From ground truth: guard i day d = label(base[(d-i) mod 6]), days 0..6
    const base = [REST, REST, 'NIGHT', REST, 'DAY', 'NIGHT'];
    const label = (s: string) => s === REST ? 'Rest' : s === 'DAY' ? 'Day' : 'Night';

    for (let i = 0; i < 6; i++) {
      for (let d = 0; d < 7; d++) {
        const expected = label(base[positiveMod(d - i, 6)]);
        const cell = report.cells.find((c) => c.guardId === `g${i}` && c.dayIndex === d);
        const actual = cell ? label(cell.shiftKey) : 'Rest';
        expectEq(actual, expected, `guard ${i} day ${d}`);
      }
    }

    // coverage: every day 1 day + 2 nights
    for (let d = 0; d < 7; d++) {
      const dayCells = report.cells.filter((c) => c.dayIndex === d);
      expectEq(dayCells.filter((c) => c.shiftKey === 'DAY').length, 1, `day ${d} day count`);
      expectEq(dayCells.filter((c) => c.shiftKey === 'NIGHT').length, 2, `day ${d} night count`);
    }

    expectEq(report.feasibility, 'FULLY_COMPLIANT');
    expectEq(report.conflicts.filter((c) => c.severity === 'CRITICAL' || c.severity === 'REST').length, 0);
  });

  test('coverage exact for pools 1..20 with various requirements', () => {
    const scenarios: [number, number, number][] = [
      [3, 1, 1], [5, 1, 2], [8, 2, 2], [10, 3, 3], [14, 3, 4], [20, 4, 4],
      [1, 1, 0], [4, 4, 0], [7, 0, 3],
    ];
    for (const [n, d, ni] of scenarios) {
      const total = d + ni;
      if (total === 0) continue;
      const report = generateSchedule(baseInput({
        pool: pool(n),
        shifts: stdShifts(d, ni),
        days: 7,
      }));
      for (let day = 0; day < 7; day++) {
        const dayCells = report.cells.filter((c) => c.dayIndex === day);
        const expectedDay = Math.min(d, n);
        const expectedNight = Math.min(ni, Math.max(0, n - d));
        // when pool < requirement, shortfall is reported; assigned = n total
        if (n >= total) {
          expectEq(dayCells.filter((c) => c.shiftKey === 'DAY').length, d, `n=${n} d=${d} ni=${ni} day ${day} day`);
          expectEq(dayCells.filter((c) => c.shiftKey === 'NIGHT').length, ni, `n=${n} day ${day} night`);
        } else {
          expectEq(dayCells.length, n, `pool ${n} < req ${total}: every guard works`);
        }
        void expectedDay;
        void expectedNight;
      }
    }
  });

  test('leave window produces conflict + controlled coverage', () => {
    const report = generateSchedule(baseInput({
      days: 6,
      leaveWindows: [{ guardId: 'g0', start: new Date(2026, 0, 1), end: new Date(2026, 0, 8) }],
    }));
    // engine must not silently ignore leave
    const hasLeaveIssue = report.conflicts.some((c) => c.code === 'ON_LEAVE' || c.severity === 'CRITICAL' || c.severity === 'REST')
      || report.feasibility === 'BEST_POSSIBLE';
    // either repaired (no conflict, still full coverage) or reported
    const coverageOk = [0, 1, 2, 3, 4, 5].every((d) => {
      const dayCells = report.cells.filter((c) => c.dayIndex === d);
      return dayCells.filter((c) => c.shiftKey === 'DAY').length <= 1
        && dayCells.filter((c) => c.shiftKey === 'NIGHT').length <= 2
        && dayCells.length <= 3;
    });
    expect(coverageOk, 'coverage must not exceed requirements');
    // g0 on leave full period: should not be assigned (or reported if unavoidable)
    const g0Cells = report.cells.filter((c) => c.guardId === 'g0');
    if (g0Cells.length > 0) {
      expect(hasLeaveIssue, 'if leave guard assigned, a conflict must be reported');
    }
  });

  test('external overlapping duty on other site is detected/repaired', () => {
    // guard g0 has an external day duty on day 0
    const start = new Date(2026, 0, 1, 6, 0, 0);
    const end = new Date(2026, 0, 1, 18, 0, 0);
    const report = generateSchedule(baseInput({
      days: 3,
      externalDuties: [{ guardId: 'g0', start, end, siteId: 'other', label: 'Other site' }],
    }));
    // g0 must not hold a cell overlapping 06:00-18:00 on day 0, OR a conflict is reported
    const day0 = report.cells.find((c) => c.guardId === 'g0' && c.dayIndex === 0);
    if (day0) {
      const overlapsExternal = day0.startAt < end && start < day0.endAt;
      if (overlapsExternal) {
        expect(
          report.conflicts.length > 0 || report.feasibility === 'BEST_POSSIBLE',
          'overlap must surface as a conflict',
        );
      }
    }
    // coverage still filled by other guards
    expectEq(report.cells.filter((c) => c.dayIndex === 0).length, 3, 'coverage maintained');
  });

  test('prior history enforces rest-before (seeded external duty)', () => {
    // g0 worked until 06:00 on day 0 — a DAY shift starting 06:00 same morning = 0h rest
    // Put prior duty ending 2026-01-01 06:00, and force g0 onto day0 by pool position
    const prevEnd = new Date(2026, 0, 1, 6, 0, 0);
    const prevStart = new Date(2025, 11, 31, 18, 0, 0);
    const report = generateSchedule(baseInput({
      days: 7,
      externalDuties: [{ guardId: 'g0', start: prevStart, end: prevEnd, label: 'Prior' }],
    }));
    // If g0 was assigned a cell starting day 0 before 18:00 (i.e. rest < 24h after prev end
    // for a 12h prior), a REST conflict must exist — engine should repair instead when possible.
    const g0Day0 = report.cells.find((c) => c.guardId === 'g0' && c.dayIndex === 0);
    if (g0Day0 && g0Day0.startAt.getTime() - prevEnd.getTime() < 24 * 3600000) {
      expect(
        report.conflicts.some((c) => c.code === 'REST_VIOLATION' || c.severity === 'REST'),
        'insufficient rest after prior duty must be reported',
      );
    }
    // coverage still exact
    for (let d = 0; d < 7; d++) {
      const dayCells = report.cells.filter((c) => c.dayIndex === d);
      expectEq(dayCells.filter((c) => c.shiftKey === 'DAY').length, 1, `day ${d} day`);
      expectEq(dayCells.filter((c) => c.shiftKey === 'NIGHT').length, 2, `day ${d} night`);
    }
  });

  test('24h single-shift mode: 6 guards fully compliant, 4 guards staffing-short', () => {
    // 24h duty + 48h rest => cycle 72h => min pool = 2 × ceil(72/24) = 6
    const ok = generateSchedule(baseInput({
      pool: pool(6),
      shifts: [{ key: 'DAY', name: 'Day Shift', startTime: '06:00', endTime: '06:00', requiredCount: 2 }],
      days: 12,
    }));
    for (let d = 0; d < 12; d++) {
      const dayCells = ok.cells.filter((c) => c.dayIndex === d);
      expectEq(dayCells.length, 2, `day ${d} coverage`);
      for (const c of dayCells) {
        expectEq(hoursBetween(c.startAt, c.endAt), 24, '24h duration');
      }
    }
    expectEq(ok.feasibility, 'FULLY_COMPLIANT');

    const short = generateSchedule(baseInput({
      pool: pool(4),
      shifts: [{ key: 'DAY', name: 'Day Shift', startTime: '06:00', endTime: '06:00', requiredCount: 2 }],
      days: 5,
    }));
    // coverage still filled; recovery rules cannot all be met with only 4 guards
    for (let d = 0; d < 5; d++) {
      expectEq(short.cells.filter((c) => c.dayIndex === d).length, 2, `short day ${d} coverage`);
    }
    expectEq(short.feasibility, 'BEST_POSSIBLE');
    expect(short.stats.staffing.recommendedAdditional > 0, 'should recommend more guards');
  });

  test('3 custom shift types with mixed durations', () => {
    const report = generateSchedule(baseInput({
      pool: pool(8),
      shifts: [
        { key: 'MORNING', name: 'Morning', startTime: '06:00', endTime: '14:00', requiredCount: 2 },
        { key: 'EVENING', name: 'Evening', startTime: '14:00', endTime: '22:00', requiredCount: 2 },
        { key: 'NIGHT', name: 'Night', startTime: '22:00', endTime: '06:00', requiredCount: 2 },
      ],
      days: 7,
    }));
    for (let d = 0; d < 7; d++) {
      const dayCells = report.cells.filter((c) => c.dayIndex === d);
      expectEq(dayCells.filter((c) => c.shiftKey === 'MORNING').length, 2, `d${d} morning`);
      expectEq(dayCells.filter((c) => c.shiftKey === 'EVENING').length, 2, `d${d} evening`);
      expectEq(dayCells.filter((c) => c.shiftKey === 'NIGHT').length, 2, `d${d} night`);
    }
    // fairness: all 8 guards work equal share over 7 days (6 slots/day * 7 / 8 = 5.25 avg)
    const total = report.cells.length;
    expectEq(total, 6 * 7);
    const perGuard = new Map<string, number>();
    for (const c of report.cells) perGuard.set(c.guardId, (perGuard.get(c.guardId) || 0) + 1);
    const counts = [...perGuard.values()];
    const min = Math.min(...counts);
    const max = Math.max(...counts);
    expect(max - min <= 1, `workload spread should be <=1 shift, got min=${min} max=${max}`);
  });

  test('determinism: same input twice => identical output', () => {
    const a = generateSchedule(baseInput({ days: 14 }));
    const b = generateSchedule(baseInput({ days: 14 }));
    const key = (r: typeof a) => r.cells.map((c) => `${c.dayIndex}:${c.guardId}:${c.shiftKey}`).join('|');
    expectEq(key(a), key(b));
    expectEq(a.feasibility, b.feasibility);
    expectEq(a.rulesFingerprint, b.rulesFingerprint);
  });

  test('validator independently catches a planted rest violation', () => {
    // Two cells for same guard back-to-back with <24h rest (night 18-06 then day 06-18 next is 0h? night ends 06 day1, day starts 06 day1 = 0h rest)
    const start = midnightOf(new Date(2026, 0, 1));
    const night = resolveShift({ key: 'NIGHT', name: 'N', startTime: '18:00', endTime: '06:00', requiredCount: 1 });
    const day = resolveShift({ key: 'DAY', name: 'D', startTime: '06:00', endTime: '18:00', requiredCount: 1 });
    const nightIv = shiftInterval(start, night);           // Jan1 18:00 -> Jan2 06:00
    const dayIv = shiftInterval(addDays(start, 1), day);   // Jan2 06:00 -> Jan2 18:00
    const result = validateCells({
      cells: [
        { guardId: 'g0', dayIndex: 0, date: '2026-01-01', shiftKey: 'NIGHT', shiftName: 'N', slotIndex: 0, startAt: nightIv.start, endAt: nightIv.end },
        { guardId: 'g0', dayIndex: 1, date: '2026-01-02', shiftKey: 'DAY', shiftName: 'D', slotIndex: 0, startAt: dayIv.start, endAt: dayIv.end },
      ],
      pool: pool(6),
      shifts: [resolveShift({ key: 'DAY', name: 'D', startTime: '06:00', endTime: '18:00', requiredCount: 1 }),
               resolveShift({ key: 'NIGHT', name: 'N', startTime: '18:00', endTime: '06:00', requiredCount: 2 })],
      restRules: DEFAULT_REST_RULES,
      startDate: start,
      days: 7,
      externalDuties: [],
      leaveWindows: [],
      onLeaveGuards: [],
    }, new Map([['g0', 'Guard 0']]));
    expect(result.ok === false, 'validator must flag 0h rest');
    expect(result.conflicts.some((c) => c.code === 'REST_VIOLATION'), 'expected REST_VIOLATION');
  });

  test('staffing estimate: 6 guards sufficient for 1D+2N; 4 insufficient', () => {
    const ok = generateSchedule(baseInput({ days: 7 }));
    expectEq(ok.stats.staffing.estimatedMinPool, 6);
    expectEq(ok.stats.staffing.recommendedAdditional, 0);
    expectEq(ok.stats.staffing.sufficient, true);

    const tight = generateSchedule(baseInput({ pool: pool(4), days: 7 }));
    expect(tight.stats.staffing.recommendedAdditional > 0, '4 guards should recommend more');
    expect(tight.conflicts.some((c) => c.code === 'STAFFING_WARNING'), 'staffing warning expected');
  });

  test('fairness stats: full cycles => high fairness index', () => {
    // 12 days = exactly 2 full 6-guard cycles => equal load by construction
    const report = generateSchedule(baseInput({ days: 12 }));
    expect(report.stats.fairness.index >= 90, `fairness index ${report.stats.fairness.index} should be >= 90`);
    expectEq(report.stats.fairness.hourSpread, 0, 'full cycles => zero hour spread');
    expect(report.stats.fairness.nightSpread <= 1, `nightSpread=${report.stats.fairness.nightSpread}`);
  });

  test('config errors: empty pool / zero requirement', () => {
    let threw = false;
    try { generateSchedule(baseInput({ pool: [] })); } catch (e: any) { threw = e.name === 'EngineConfigError'; }
    expect(threw, 'empty pool throws EngineConfigError');

    threw = false;
    try {
      generateSchedule(baseInput({ shifts: [{ key: 'DAY', name: 'D', startTime: '06:00', endTime: '18:00', requiredCount: 0 }] }));
    } catch (e: any) { threw = e.name === 'EngineConfigError'; }
    expect(threw, 'zero requirement throws EngineConfigError');
  });

  test('on-leave guard not silently scheduled without reporting', () => {
    const report = generateSchedule(baseInput({ days: 6, onLeaveGuards: ['g0'] }));
    const g0 = report.cells.filter((c) => c.guardId === 'g0');
    if (g0.length > 0) {
      expect(report.conflicts.length > 0 || report.feasibility === 'BEST_POSSIBLE', 'must report leave conflict');
    }
    // coverage: other 5 guards still cover 3 slots/day
    for (let d = 0; d < 6; d++) {
      expectEq(report.cells.filter((c) => c.dayIndex === d).length, 3, `day ${d} coverage`);
    }
  });
}
