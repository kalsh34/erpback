/**
 * LIFECYCLE STATUS-MACHINE REGRESSION CHECK.
 *
 * Covers the stabilization-phase defect: a payroll run that reached a locked
 * status (SUBMITTED / CHECKED / APPROVED / PAID) could be modified again by a
 * parallel `calculate` / `recalculate` / `pay` call because the status guard
 * was only read once at the start of the operation.
 *
 * These checks exercise the pure guard logic in isolation (no DB): they assert
 * the compiled service source actually contains the save-time guards, and
 * verify the EDITABLE_STATUSES sets exclude locked statuses.
 *
 * Run: npx ts-node --transpile-only tests/lifecycleGuard.check.ts   (no DB)
 */
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log('OK:', msg); }
  else { failed++; console.error('FAIL:', msg); }
}

const root = path.join(__dirname, '..');

// ── 1. EDITABLE_STATUSES must NOT contain locked statuses ──────────────
const guardSrc = fs.readFileSync(path.join(root, 'src/modules/guardPayroll/guardPayrollRun.service.ts'), 'utf8');
const staffSrc = fs.readFileSync(path.join(root, 'src/modules/staffPayroll/staffPayrollRun.service.ts'), 'utf8');

const editableRe = /EDITABLE_STATUSES\s*=\s*\[([^\]]*)\]/;
const guardEditable = guardSrc.match(editableRe)?.[1] ?? '';
const staffEditable = staffSrc.match(editableRe)?.[1] ?? '';

ok(!/SUBMITTED|CHECKED|APPROVED|PAID/.test(guardEditable), 'guard EDITABLE_STATUSES excludes locked statuses');
ok(!/SUBMITTED|CHECKED|APPROVED|PAID/.test(staffEditable), 'staff EDITABLE_STATUSES excludes locked statuses');
ok(guardEditable.includes('DRAFT') && guardEditable.includes('CALCULATED') && guardEditable.includes('RETURNED'),
  'guard EDITABLE_STATUSES keeps DRAFT/CALCULATED/RETURNED');

// ── 2. markPaid must be an atomic conditional update, not read-then-save ─
ok(/findOneAndUpdate\(\s*\{\s*_id:\s*runId,\s*status:\s*PayrollRecordStatus\.APPROVED\s*\}/.test(guardSrc),
  'guard markPaid uses atomic condition {status: APPROVED} at save time');
ok(/no longer APPROVED \(concurrent change detected\)/.test(guardSrc), 'guard markPaid rejects a run flipped between load and save');

// ── 3. calculate() must re-verify status right before committing records ─
ok(/moved to \$\{freshStatus\.status\} during calculation/.test(guardSrc),
  'guard calculate() re-checks status before committing records/totals');
ok(/moved to \$\{freshStatus\.status\} during calculation/.test(staffSrc),
  'staff calculate() re-checks status before committing records/totals');

// ── 4. assertStatusAtSave present and used on the transition points ─────
ok(guardSrc.includes('assertStatusAtSave'), 'guard service defines assertStatusAtSave');
const guardSubmitAtSave = /static async submit[\s\S]*?assertStatusAtSave\(runId/.test(guardSrc);
const guardApproveAtSave = /static async approve[\s\S]*?assertStatusAtSave\(runId/.test(guardSrc);
ok(guardSubmitAtSave, 'guard submit() re-checks status at save');
ok(guardApproveAtSave, 'guard approve() re-checks status at save');

// ── 5. Controller recalculate must route through the guarded service ────
const guardCtl = fs.readFileSync(path.join(root, 'src/modules/guardPayroll/guardPayroll.controller.ts'), 'utf8');
ok(/GuardPayrollRunService\.recalculate\(req\.params\.id/.test(guardCtl),
  'guard recalculateRun goes through GuardPayrollRunService.recalculate (status-guarded), not raw getRun+calculate');

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
