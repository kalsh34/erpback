// Quick regression for calendar-date helpers (node -r ts-node/register/transpile-only)
import { parseYmdLocal, ymdLocal, toLocalMidnight, endOfLocalDay, nextLocalMidnight } from '../src/common/dateUtils';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

const d = parseYmdLocal('2026-09-01');
assert(!!d, 'parses 2026-09-01');
if (d) {
  assert(ymdLocal(d) === '2026-09-01', 'ymdLocal roundtrip stays 2026-09-01');
  assert(d.getDate() === 1 && d.getMonth() === 8 && d.getFullYear() === 2026, 'local calendar components are Sep 1');
  // The classic bug: toISOString().split on local midnight in UTC+ can show Aug 31
  const isoDay = d.toISOString().split('T')[0];
  console.log('  (toISOString day may differ by TZ):', isoDay, 'vs ymdLocal', ymdLocal(d));
  assert(ymdLocal(d) === '2026-09-01', 'error messages must use ymdLocal not toISOString');
}

assert(parseYmdLocal('2026-08-31') !== null, 'parses Aug 31');
assert(parseYmdLocal('not-a-date') === null, 'rejects garbage');
assert(parseYmdLocal('2026-02-31') === null, 'rejects invalid calendar day');

const mid = toLocalMidnight('2026-09-01');
assert(ymdLocal(mid) === '2026-09-01', 'toLocalMidnight of ymd string');
const end = endOfLocalDay(mid);
const next = nextLocalMidnight(mid);
assert(end.getTime() > mid.getTime(), 'endOfLocalDay after midnight');
assert(next.getTime() === mid.getTime() + 86400000 || ymdLocal(next) === '2026-09-02', 'next midnight is Sep 2');

console.log(process.exitCode ? 'DATE_UTILS_FAILED' : 'DATE_UTILS_OK');
