/**
 * PROFORMA MODULE regression suite (pure logic — no database needed).
 *
 * Covers the pricing rules the issuing page depends on:
 *  - headcount = posts/day × role multiplier, line = headcount × rate;
 *  - 15% VAT charged only on VAT-applicable lines, subtotal/grand total
 *    cent-rounded;
 *  - validity = issue date + validity days (calendar safe);
 *  - lifecycle transitions: issued documents never return to DRAFT;
 *  - shift-pattern wording used by the auto-generated note.
 */
import {
  round2,
  computeItemValues,
  computeProformaTotals,
  addDays,
  PROFORMA_VAT_RATE,
  PROFORMA_DEFAULT_VALIDITY_DAYS,
  PROFORMA_TRANSITIONS,
  ProformaStatus,
} from '../src/models/Proforma';
import { describeShiftPattern, ShiftPattern } from '../src/models/ServiceRole';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('OK:', msg);
  }
}

// ── money rounding ──────────────────────────────────────────────────────────
assert(round2(1150.005) === 1150.01, 'round2 rounds half up (1150.005 → 1150.01)');
assert(round2(0.1 + 0.2) === 0.3, 'round2 cleans float noise (0.30000000000000004 → 0.3)');
assert(round2(108000) === 108000, 'round2 keeps integers untouched');
assert(PROFORMA_VAT_RATE === 0.15, 'VAT rate is 15%');
assert(PROFORMA_DEFAULT_VALIDITY_DAYS === 15, 'default validity is 15 days');

// ── headcount rule (posts/day × multiplier) ─────────────────────────────────
const guard = computeItemValues(3, 3, 12000);
assert(guard.totalHeadcount === 9, 'headcount = 3 posts × 3 multiplier = 9');
assert(guard.lineTotal === 108000, 'line total = 9 × 12,000 = 108,000');

const single = computeItemValues(1, 3, 13000);
assert(single.totalHeadcount === 3 && single.lineTotal === 39000, 'single post at 13,000 → 3 staff / 39,000');

// ── VAT applies to VAT-applicable lines only ────────────────────────────────
const totals = computeProformaTotals([
  { lineTotal: 108000, vatApplicable: true },
  { lineTotal: 1000, vatApplicable: false },
]);
assert(totals.subtotal === 109000, 'subtotal sums every line (109,000)');
assert(totals.vatAmount === 16200, 'VAT is 15% of the VAT-applicable line only (16,200)');
assert(totals.grandTotal === 125200, 'grand total = subtotal + VAT (125,200)');

const noVat = computeProformaTotals([{ lineTotal: 5000, vatApplicable: false }]);
assert(noVat.vatAmount === 0 && noVat.grandTotal === 5000, 'no VAT when no line is VAT-applicable');

// ── validity date ───────────────────────────────────────────────────────────
const issued = new Date(2026, 0, 20); // 20 Jan 2026 (local)
const valid = addDays(issued, 15);
assert(
  valid.getFullYear() === 2026 && valid.getMonth() === 1 && valid.getDate() === 4,
  'issue date + 15 days lands on 4 Feb 2026'
);

// ── lifecycle: issued documents are never editable again ────────────────────
assert(
  PROFORMA_TRANSITIONS[ProformaStatus.DRAFT].includes(ProformaStatus.ISSUED),
  'DRAFT can be issued'
);
assert(
  !PROFORMA_TRANSITIONS[ProformaStatus.ISSUED].includes(ProformaStatus.DRAFT),
  'ISSUED can never return to DRAFT'
);
assert(
  PROFORMA_TRANSITIONS[ProformaStatus.ISSUED].includes(ProformaStatus.CONVERTED),
  'ISSUED can be converted to a contract/order'
);
assert(PROFORMA_TRANSITIONS[ProformaStatus.CONVERTED].length === 0, 'CONVERTED is terminal');

// ── note wording ────────────────────────────────────────────────────────────
assert(
  describeShiftPattern(ShiftPattern.CONTINUOUS_24_48).includes('24 hours on duty'),
  '24/48 shift wording is generated for the note'
);
assert(
  describeShiftPattern(ShiftPattern.DAY_SHIFT).includes('day shift'),
  'day-shift wording is generated for the note'
);

console.log(process.exitCode ? 'PROFORMA_MODULE_FAILED' : 'PROFORMA_MODULE_OK');
