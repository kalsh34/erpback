import { RotationService } from './src/modules/hr/rotation/rotation.service';
import { buildBaseSequence, positiveMod, rotationSlotFor } from './src/modules/hr/rotation/rotation.formula';

type Cell = 'Day' | 'Night' | 'Rest';

function label(slot: string): Cell {
  if (slot === 'DAY') return 'Day';
  if (slot === 'NIGHT') return 'Night';
  return 'Rest';
}

function makeRot(pool: number, dayC: number, nightC: number, startDate: Date) {
  return {
    guardPool: Array.from({ length: pool }, (_, i) => ({
      guardId: { toString: () => `g${i}` } as any,
      status: 'ACTIVE',
      order: i,
    })),
    dayShiftCount: dayC,
    nightShiftCount: nightC,
    dayStartTime: '06:00',
    nightEndTime: '18:00',
    startDate,
  } as any;
}

function trail(rot: any, days: number): Cell[][] {
  const pool = rot.guardPool.length;
  const grid: Cell[][] = Array.from({ length: pool }, () => []);
  for (let d = 0; d < days; d++) {
    const date = new Date(rot.startDate);
    date.setDate(date.getDate() + d);
    date.setHours(12, 0, 0, 0);
    const assigns = RotationService.computeDayAssignments(rot, date);
    for (let i = 0; i < pool; i++) {
      const mine = assigns.find((a: any) => (a.guardId as any).toString() === `g${i}`);
      grid[i].push(mine ? label(mine.shiftType) : 'Rest');
    }
  }
  return grid;
}

function coverageOk(rot: any, days: number): boolean {
  for (let d = 0; d < days; d++) {
    const date = new Date(rot.startDate);
    date.setDate(date.getDate() + d);
    date.setHours(12, 0, 0, 0);
    const assigns = RotationService.computeDayAssignments(rot, date);
    const D = assigns.filter((a: any) => a.shiftType === 'DAY').length;
    const N = assigns.filter((a: any) => a.shiftType === 'NIGHT').length;
    if (D !== rot.dayShiftCount || N !== rot.nightShiftCount) return false;
  }
  return true;
}

const out: string[] = [];
let failures = 0;

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION 1 — Ground truth: 6 guards, 1 Day + 2 Night, base = Denmark Embassy
// ═══════════════════════════════════════════════════════════════════════════
const GUARDS = ['Kibrom Abreha', 'Esayas Gari', 'Hailu Bekele', 'Tadese Tasew', 'Belay Yilma', 'Yednekachew Assefa'];
const EXPECTED: Cell[][] = [
  // Day1           Day2           Day3           Day4           Day5           Day6           Day7(=Day1)
  ['Rest', 'Rest', 'Night', 'Rest', 'Day', 'Night', 'Rest'],     // Kibrom
  ['Night', 'Rest', 'Rest', 'Night', 'Rest', 'Day', 'Night'],     // Esayas
  ['Day', 'Night', 'Rest', 'Rest', 'Night', 'Rest', 'Day'],       // Hailu
  ['Rest', 'Day', 'Night', 'Rest', 'Rest', 'Night', 'Rest'],      // Tadese
  ['Night', 'Rest', 'Day', 'Night', 'Rest', 'Rest', 'Night'],     // Belay
  ['Rest', 'Night', 'Rest', 'Day', 'Night', 'Rest', 'Rest'],      // Yednekachew
];

const rot6 = makeRot(6, 1, 2, new Date(2026, 0, 1));
const base6 = buildBaseSequence(6, 1, 2);

out.push('══════════════════════════════════════════════════════════════════');
out.push('VALIDATION 1 — 6 guards, requirement 1 Day (0600) + 2 Night (1800)');
out.push('══════════════════════════════════════════════════════════════════');
out.push(`buildBaseSequence(6, 1, 2) = [${base6.sequence.map((s) => label(s)).join(', ')}]`);
out.push(`expected base               = [Rest, Rest, Night, Rest, Day, Night]`);
const baseMatches =
  base6.sequence.join(',') === ['REST', 'REST', 'NIGHT', 'REST', 'DAY', 'NIGHT'].join(',');
if (!baseMatches) { failures++; out.push('  ✗ BASE SEQUENCE MISMATCH'); } else { out.push('  ✓ base sequence matches'); }
out.push('');

const actual6 = trail(rot6, 7);
const head = ['Day'.padEnd(6), ...GUARDS.map((g) => g.padEnd(17))].join(' | ');
out.push(head);
out.push('-'.repeat(head.length));
let allMatch = true;
for (let d = 0; d < 7; d++) {
  const row = [`D${d + 1}`.padEnd(6)];
  for (let i = 0; i < 6; i++) {
    const got = actual6[i][d];
    const want = EXPECTED[i][d];
    const ok = got === want;
    if (!ok) allMatch = false;
    row.push((ok ? got : `${got}!=${want}`).padEnd(17));
  }
  out.push(row.join(' | '));
}
out.push('');
if (allMatch) { out.push('  ✓ ALL 42 CELLS MATCH THE GROUND-TRUTH TABLE EXACTLY'); }
else { failures++; out.push('  ✗ CELL MISMATCH — see ! marks above'); }

// Per-guard trail
out.push('');
out.push('Per-guard trail (ground truth output):');
for (let i = 0; i < 6; i++) {
  const t = actual6[i];
  const D = t.filter((x) => x === 'Day').length;
  const N = t.filter((x) => x === 'Night').length;
  const R = t.filter((x) => x === 'Rest').length;
  out.push(`  ${GUARDS[i].padEnd(17)} | ${t.map((x) => x.padEnd(5)).join('|')} | D=${D} N=${N} R=${R}`);
}
if (!coverageOk(rot6, 7)) { failures++; out.push('  ✗ COVERAGE FAILED'); } else { out.push('  ✓ exact 1 Day + 2 Night coverage every day'); }

// Repeat check (day 7 == day 1)
const repeats = actual6.every((row) => row[6] === row[0]);
out.push(`  ${repeats ? '✓' : '✗'} day 7 repeats day 1 (period = N = 6 days)`);

// Formula identity check: baseSequence[(d - i) mod N]
out.push('');
out.push('Formula identity check (baseSequence[(d - i) mod 6]):');
let identityOk = true;
for (let d = 0; d < 7; d++) {
  for (let i = 0; i < 6; i++) {
    const expectedSlot = label(rotationSlotFor(base6.sequence, d, i));
    if (expectedSlot !== EXPECTED[i][d]) identityOk = false;
  }
}
out.push(`  ${identityOk ? '✓' : '✗'} rotationSlotFor(base, d, i) reproduces the table for every (d, i)`);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION 2 — 14 guards, 3 Day + 4 Night (previously broken)
// ═══════════════════════════════════════════════════════════════════════════
out.push('');
out.push('══════════════════════════════════════════════════════════════════');
out.push('VALIDATION 2 — 14 guards, requirement 3 Day + 4 Night (was static)');
out.push('══════════════════════════════════════════════════════════════════');
const rot14 = makeRot(14, 3, 4, new Date(2026, 0, 1));
const base14 = buildBaseSequence(14, 3, 4);
out.push(`base sequence: [${base14.sequence.map((s) => label(s)).join(', ')}]`);
const t14 = trail(rot14, 14);
let cov14 = coverageOk(rot14, 14);
let mix14 = true;
const G14 = Array.from({ length: 14 }, (_, i) => `Guard-${i + 1}`);
for (let i = 0; i < 14; i++) {
  const t = t14[i];
  const D = t.filter((x) => x === 'Day').length;
  const N = t.filter((x) => x === 'Night').length;
  const R = t.filter((x) => x === 'Rest').length;
  // Genuine mix: over a full 14-day cycle each guard must see all three kinds
  if (!(D > 0 && N > 0 && R > 0)) mix14 = false;
  out.push(`  ${G14[i].padEnd(8)} | ${t.map((x) => x.padEnd(5)).join('|')} | D=${D} N=${N} R=${R}`);
}
out.push(`  ${cov14 ? '✓' : '✗'} exact 3 Day + 4 Night coverage every day`);
out.push(`  ${mix14 ? '✓' : '✗'} every guard sees Day, Night AND Rest across one full cycle`);
if (!cov14 || !mix14) failures++;
const anyStatic14 = t14.some((row) => new Set(row).size === 1);
out.push(`  ${!anyStatic14 ? '✓' : '✗'} no guard is stuck on one static shift`);

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION 3 — 8 guards, 2 Day + 2 Night (previously broken)
// ═══════════════════════════════════════════════════════════════════════════
out.push('');
out.push('══════════════════════════════════════════════════════════════════');
out.push('VALIDATION 3 — 8 guards, requirement 2 Day + 2 Night (was static)');
out.push('══════════════════════════════════════════════════════════════════');
const rot8 = makeRot(8, 2, 2, new Date(2026, 0, 1));
const base8 = buildBaseSequence(8, 2, 2);
out.push(`base sequence: [${base8.sequence.map((s) => label(s)).join(', ')}]`);
const t8 = trail(rot8, 8);
let cov8 = coverageOk(rot8, 8);
let mix8 = true;
const G8 = Array.from({ length: 8 }, (_, i) => `Guard-${i + 1}`);
for (let i = 0; i < 8; i++) {
  const t = t8[i];
  const D = t.filter((x) => x === 'Day').length;
  const N = t.filter((x) => x === 'Night').length;
  const R = t.filter((x) => x === 'Rest').length;
  if (!(D > 0 && N > 0 && R > 0)) mix8 = false;
  out.push(`  ${G8[i].padEnd(8)} | ${t.map((x) => x.padEnd(5)).join('|')} | D=${D} N=${N} R=${R}`);
}
out.push(`  ${cov8 ? '✓' : '✗'} exact 2 Day + 2 Night coverage every day`);
out.push(`  ${mix8 ? '✓' : '✗'} every guard sees Day, Night AND Rest across one full cycle`);
if (!cov8 || !mix8) failures++;
const anyStatic8 = t8.some((row) => new Set(row).size === 1);
out.push(`  ${!anyStatic8 ? '✓' : '✗'} no guard is stuck on one static shift`);

out.push('');
out.push('══════════════════════════════════════════════════════════════════');
out.push(failures === 0 ? 'RESULT: ALL VALIDATIONS PASSED' : `RESULT: ${failures} VALIDATION(S) FAILED`);
out.push('══════════════════════════════════════════════════════════════════');

const text = out.join('\n');
console.log(text);
require('fs').writeFileSync('rotation-validation.txt', text);
process.exit(failures === 0 ? 0 : 1);
