import { RotationService } from './src/modules/hr/rotation/rotation.service';
import * as fs from 'fs';

const NAMES = ['MEBRATU', 'MILLION', 'MATIOS', 'DESTALEM', 'KEBEDE', 'DAWIT', 'EJEGU', 'SOLOMON'];
const lines: string[] = [];

function run(label: string, pool: number, dayC: number, nightC: number, days: number) {
  const rot: any = {
    guardPool: NAMES.slice(0, pool).map((name, i) => ({ guardId: { toString: () => `g${i}` } as any, status: 'ACTIVE', order: i })),
    dayShiftCount: dayC,
    nightShiftCount: nightC,
    dayStartTime: '06:00',
    nightEndTime: '18:00',
    startDate: new Date(2026, 8, 21),
  };
  const grid: Record<string, string[]> = {};
  NAMES.slice(0, pool).forEach((n) => { grid[n] = []; });
  let coverageOk = true;

  for (let d = 0; d < days; d++) {
    const date = new Date(2026, 8, 21 + d, 12);
    const assigns = RotationService.computeDayAssignments(rot, date);
    const dayN = assigns.filter((x: any) => x.shiftType === 'DAY').length;
    const nightN = assigns.filter((x: any) => x.shiftType === 'NIGHT').length;
    if (dayN !== dayC || nightN !== nightC) coverageOk = false;
    for (let i = 0; i < pool; i++) {
      const mine = assigns.find((x: any) => (x.guardId as any).toString() === `g${i}`);
      grid[NAMES[i]].push(mine ? (mine.shiftType === 'DAY' ? 'DAY ' : 'NGT ') : 'rest');
    }
  }

  lines.push(`\n=== ${label}: ${pool} guards, ${dayC} Day + ${nightC} Night per day, ${days} days ===`);
  lines.push(`daily coverage exactly ${dayC}D+${nightC}N on every day: ${coverageOk}`);
  for (const n of Object.keys(grid)) {
    const t = grid[n];
    const D = t.filter((x) => x === 'DAY ').length;
    const N = t.filter((x) => x === 'NGT ').length;
    const R = t.filter((x) => x === 'rest').length;
    lines.push(`${n.padEnd(9)} | ${t.join('|')} | D=${D} N=${N} R=${R}`);
  }
}

// The user's reported test case (8 guards) and the stated 4-guard case
run('CASE A', 8, 2, 2, 16);
run('CASE B', 4, 2, 2, 8);

fs.writeFileSync('rotation-trail.txt', lines.join('\n'));
console.log('DONE');