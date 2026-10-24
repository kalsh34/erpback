import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { SiteCompensationService } from '../src/modules/guardPayroll/siteCompensation.service';
import { GuardPayrollConfigService } from '../src/modules/guardPayroll/guardPayrollConfig.service';
import { GuardSiteCompensation } from '../src/models/GuardSiteCompensation';
import { Site } from '../src/models/Site';
import { computePrimarySite } from '../src/modules/guardPayroll/guardPayrollEngine';
import { SiteStatus, SiteType } from '../src/types';

/**
 * Isolated check for the three tester-reported payroll fixes:
 *   1. per-site formula overrides (rate source GuardSiteCompensation.formula)
 *   2. same-day compensation change amends the current row instead of erroring
 *   3. idempotent repeated saves do not create duplicate history/rows
 * Runs on a throwaway guard_comp_check_* database; no replica set required
 * because the transactional wrapper is bypassed via createTransactional
 * (the transaction guard is verified separately by the type system + server).
 * Usage: npx ts-node --transpile-only tests/siteCompensationFormula.check.ts
 */
const dbName = `guard_comp_check_${Date.now()}`;
const uri = `mongodb://127.0.0.1:27017/${dbName}`;

const GLOBAL = { transportPercent: 20, standardMonthlyHours: 240, sundayStructuralHours: 32, basicHourlyDivisor: 208 };
const createTx = (SiteCompensationService as any).createTransactional.bind(SiteCompensationService);

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`PASS ${name}`);
  else { failures++; console.error(`FAIL ${name} ${detail}`); }
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (!mongoose.connection.db!.databaseName.startsWith('guard_comp_check_')) {
    throw new Error('Refusing non-isolated database');
  }
  await Promise.all([GuardSiteCompensation.init(), Site.init()]);
  await GuardPayrollConfigService.get(); // creates the global singleton with defaults

  const stamp = Date.now();
  const siteA = await Site.create({ siteName: `Formula Site A ${stamp}`, siteCode: `FSA${stamp}`, location: 'Addis Ababa', siteType: SiteType.COMMERCIAL, status: SiteStatus.ACTIVE, radiusMeters: 100, agreedManpower: 1, actualManpower: 1 });
  const siteB = await Site.create({ siteName: `Formula Site B ${stamp}`, siteCode: `FSB${stamp}`, location: 'Addis Ababa', siteType: SiteType.COMMERCIAL, status: SiteStatus.ACTIVE, radiusMeters: 100, agreedManpower: 1, actualManpower: 1 });
  const siteAId = (siteA._id as any).toString();
  const siteBId = (siteB._id as any).toString();
  const userId = new mongoose.Types.ObjectId();
  const today = new Date().toISOString().slice(0, 10);

  // 1. Baseline create — no per-site formula.
  const rowA = await createTx({ siteId: siteAId, compensationAmount: 9000, effectiveFrom: today, userId });
  check('create returns current row', !!rowA.isCurrent);

  // 2. Same-day change AMENDS instead of the "later compensation" error.
  const amended = await createTx({ siteId: siteAId, compensationAmount: 8000, effectiveFrom: today, userId, reason: 'tester retry' });
  check('same-day change amends the current row (no error)', String(amended._id) === String(rowA._id));
  check('same-day amendment applied the new amount', amended.compensationAmount === 8000);
  check('same-day amendment keeps one audit entry', amended.changeHistory.length === 1
    && amended.changeHistory[0].previousAmount === 9000
    && amended.changeHistory[0].newAmount === 8000);
  const rowsAfterAmend = await GuardSiteCompensation.find({ siteId: siteAId });
  check('same-day amendment does not create a second row', rowsAfterAmend.length === 1);

  // 3. Idempotent repeated save — no extra history.
  const again = await createTx({ siteId: siteAId, compensationAmount: 8000, effectiveFrom: today, userId });
  check('identical same-day save is idempotent', String(again._id) === String(rowA._id) && again.changeHistory.length === 1);

  // 4. Per-site formula via the same-day path.
  const withFormula = await createTx({
    siteId: siteAId, compensationAmount: 8000, effectiveFrom: today, userId,
    formula: { standardMonthlyHours: 200, transportPercent: 25 },
  });
  check('same-day formula amendment stores overrides', withFormula.formula?.standardMonthlyHours === 200 && withFormula.formula?.transportPercent === 25);
  check('formula path also keeps an audit entry', withFormula.changeHistory.length === 2);

  // 5. Resolved formula falls back to global defaults for missing values.
  const resolvedA = await SiteCompensationService.formulaFor(withFormula);
  check('per-site override wins', resolvedA.standardMonthlyHours === 200 && resolvedA.transportPercent === 25);
  check('unset values fall back to global config', resolvedA.sundayStructuralHours === GLOBAL.sundayStructuralHours && resolvedA.basicHourlyDivisor === GLOBAL.basicHourlyDivisor);
  const rowB = await createTx({ siteId: siteBId, compensationAmount: 12000, effectiveFrom: today, userId });
  const resolvedB = await SiteCompensationService.formulaFor(rowB);
  check('site without overrides resolves to pure global config', JSON.stringify(resolvedB) === JSON.stringify(GLOBAL));

  // 6. Engine honours per-site formula.
  const siteCalc = computePrimarySite({ siteId: siteAId, compensationAmount: 8000, hours: { normalHours: 10, holidayHours: 0, sundayHours: 0 }, formula: { standardMonthlyHours: 200, transportPercent: 25 } }, GLOBAL);
  check('engine OT rate uses the per-site divisor (8000/200)', siteCalc.otRate === 40);
  const defaultCalc = computePrimarySite({ siteId: siteBId, compensationAmount: 12000, hours: { normalHours: 10, holidayHours: 0, sundayHours: 0 } }, GLOBAL);
  check('engine default divisor unchanged (12000/240)', defaultCalc.otRate === 50);

  // 7. Normal future-dated flow still retires the old row.
  await createTx({ siteId: siteAId, compensationAmount: 9500, effectiveFrom: '2026-11-01', userId });
  const finalRows = await GuardSiteCompensation.find({ siteId: siteAId }).sort({ effectiveFrom: 1 });
  check('future-dated change still creates a new current row', finalRows.length === 2 && finalRows[1].isCurrent && finalRows[1].compensationAmount === 9500);
  check('previous row is closed the day before', finalRows[0].effectiveTo?.toISOString().slice(0, 10) === '2026-10-31' && !finalRows[0].isCurrent);

  // 8. The DB index blocks a second current rate for the same site outright.
  const blockedRow = await GuardSiteCompensation.create({ siteId: siteBId, compensationAmount: 9999, effectiveFrom: new Date(Date.now() - 90 * 24 * 3600 * 1000), isCurrent: false });
  let uniqueBlocked = false;
  try {
    await GuardSiteCompensation.updateOne({ _id: blockedRow._id }, { $set: { isCurrent: true } });
    const currents = await GuardSiteCompensation.find({ siteId: siteBId, isCurrent: true });
    uniqueBlocked = currents.length === 1; // update silently kept single current (unexpected)
  } catch {
    uniqueBlocked = true; // the unique index rejected the second current row
  }
  check('unique index enforces one current rate per site', uniqueBlocked);

  // 9. Legacy databases (no index yet) could hold stray duplicate currents;
  // create() must self-heal them. Simulate by dropping the index temporarily.
  await mongoose.connection.db!.collection('guardsitecompensations').dropIndex('siteId_1');
  await GuardSiteCompensation.updateOne({ _id: blockedRow._id }, { $set: { isCurrent: true } });
  const strays = await GuardSiteCompensation.find({ siteId: siteBId, isCurrent: true });
  check('stray duplicate current injected (legacy simulation)', strays.length === 2);
  const all = await SiteCompensationService.listAll({ siteId: siteAId });
  check('listAll returns resolved formula for each row', Array.isArray(all) && all.length === 2 && (all[1] as any).formula.transportPercent === 25);
  const healed = await createTx({ siteId: siteBId, compensationAmount: 12500, effectiveFrom: today, userId });
  check('create retires the stray duplicate current rate', healed.compensationAmount === 12500);
  const currentsAfterHeal = await GuardSiteCompensation.find({ siteId: siteBId, isCurrent: true });
  check('exactly ONE current rate remains for the site after self-heal', currentsAfterHeal.length === 1 && String(currentsAfterHeal[0]._id) === String(healed._id));
  await GuardSiteCompensation.init().catch(() => {}); // rebuild the unique index
  await GuardSiteCompensation.syncIndexes();
  let reblocked = false;
  try {
    await GuardSiteCompensation.updateOne({ _id: blockedRow._id }, { $set: { isCurrent: true } });
  } catch {
    reblocked = true;
  }
  check('unique index is rebuilt after self-heal', reblocked);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
