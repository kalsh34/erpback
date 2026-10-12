import mongoose from 'mongoose';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../src/config/env';
import '../src/models/Site';
import { Employee } from '../src/models/Employee';
import { PrimarySiteAssignment } from '../src/models/PrimarySiteAssignment';
import { GuardPayrollRun } from '../src/models/GuardPayrollRun';
import { GuardPayrollRecord } from '../src/models/GuardPayrollRecord';
import { GuardAttendanceRecord } from '../src/models/GuardAttendanceRecord';
import { GuardMonthlyHours } from '../src/models/GuardMonthlyHours';
import { GuardSiteCompensation } from '../src/models/GuardSiteCompensation';
import { Contract } from '../src/models/Contract';
import { GuardPayrollRunService as Payroll } from '../src/modules/guardPayroll/guardPayrollRun.service';
import { GuardMonthlyHoursService as Hours } from '../src/modules/hr/guardAttendance/monthlyHours.service';
import { GuardAttendanceService as Attendance } from '../src/modules/hr/guardAttendance/guardAttendance.service';
import { GuardService } from '../src/modules/hr/guards/guard.service';
import { StatutoryService } from '../src/modules/payrollCommon/statutory.service';
import { primaryOverlaps, resolveMonthlyPrimary } from '../src/modules/guardPayroll/assignmentTimeline';
import { EmployeeDeduction } from '../src/models/EmployeeDeduction';

const r2 = (n: number) => Math.round(n * 100) / 100;
const evidence: Record<string, unknown> = {};
let checks = 0;
function check(name: string, actual: unknown, expected: unknown) {
  assert.deepEqual(actual, expected, name); checks++; console.log(`PASS ${name}`);
}
async function rejects(name: string, work: () => Promise<unknown>) {
  await assert.rejects(work); checks++; console.log(`PASS ${name}`);
}

async function main() {
  // The only source connection is read-only in this script; all writes use a new local database.
  const source = await mongoose.createConnection(config.mongoUri).asPromise();
  const dbName = `guard_audit_${Date.now()}`;
  const uri = `mongodb://127.0.0.1:27028/${dbName}?replicaSet=guardAudit`;
  await mongoose.connect(uri);
  evidence.isolation = { database: dbName, port: 27028, sourceWrites: 0, paymentExecution: false };
  const collectionNames = ['employees', 'sites', 'contracts', 'primarysiteassignments', 'guardmonthlyhours', 'guardattendancerecords', 'guardsitecompensations', 'guardpayrollconfigs', 'taxbrackets', 'pensionrules', 'employeedeductions', 'users'];
  for (const name of collectionNames) {
    const docs = await source.db!.collection(name).find({}).toArray();
    if (docs.length) await mongoose.connection.db!.collection(name).insertMany(docs);
  }
  await source.close();
  fs.mkdirSync(path.resolve('../.guard-audit'), { recursive: true });
  fs.writeFileSync(path.resolve('../.guard-audit/database.json'), JSON.stringify({ uri, dbName }));
  await Promise.all([GuardPayrollRun.init(), GuardPayrollRecord.init(), PrimarySiteAssignment.init(), GuardMonthlyHours.init(), GuardAttendanceRecord.init()]);
  const user = await mongoose.connection.db!.collection('users').findOne({ role: 'SUPER_ADMIN' });
  assert.ok(user); const userId = user._id.toString();
  const a = (id: string, primary: boolean, from: string, to?: string) => ({ _id: id, isPrimary: primary, effectiveFrom: new Date(from), effectiveTo: to ? new Date(to) : undefined });
  check('additional assignments are not primary conflicts', primaryOverlaps([a('p', true, '2026-01-01'), a('s', false, '2026-01-01')]).length, 0);
  check('inclusive same-day boundary overlaps', primaryOverlaps([a('a', true, '2026-01-01', '2026-01-10'), a('b', true, '2026-01-10')]).length, 1);
  check('next-day historical boundary does not overlap', primaryOverlaps([a('a', true, '2026-01-01', '2026-01-10'), a('b', true, '2026-01-11')]).length, 0);
  check('sequential mid-month change is explicit blocker', resolveMonthlyPrimary([a('a', true, '2026-01-01', '2026-01-10'), a('b', true, '2026-01-11')], new Date('2026-01-01'), new Date('2026-01-31')).code, 'PRIMARY_SITE_CHANGE');
  check('missing primary never inferred', resolveMonthlyPrimary([a('s', false, '2026-01-01')], new Date('2026-01-01'), new Date('2026-01-31')).code, 'NO_PRIMARY_SITE');

  const period = '2026-10';
  const feed = await Hours.getPayrollHours(2026, 10);
  const summary = await Attendance.getMonthlyTotals(2026, 10);
  for (const row of summary.rows) {
    const raw = feed.guards.find((g) => g.guardId === row.guard._id.toString());
    check(`attendance summary ${row.guard.employeeCode}`, row.totalHours, raw ? r2(raw.totals.normalHours + raw.totals.sundayHours + raw.totals.holidayHours) : 0);
  }
  await rejects('copied mid-month compensation change blocks arbitrary pricing', () => Payroll.calculate(period, userId));
  evidence.sourceCompensationHistory = await GuardSiteCompensation.find().lean();
  // Explicit isolated monthly-rate scenario: retain original row IDs, use the earlier agreed rate for the full test month.
  // This is NOT a correction of source history or a claim that it is the correct production October rate.
  const rateRows = await GuardSiteCompensation.find().sort({ effectiveFrom: 1 });
  const seenRates = new Set<string>();
  for (const rate of rateRows) {
    const key = rate.siteId.toString();
    if (seenRates.has(key)) await rate.deleteOne();
    else { seenRates.add(key); rate.effectiveTo = undefined; rate.isCurrent = true; await rate.save(); }
  }
  evidence.fixturePolicy = 'Independent reconciliation uses copied real guard/attendance IDs and earlier site compensation amounts, normalized to a single monthly rate ONLY in the isolated copy. Source October has an unsupported mid-month rate change.';
  const initial = await Payroll.calculate(period, userId);
  evidence.initialProblems = initial.run.problems.map((p) => ({ guard: p.employeeId, code: p.code, message: p.message }));
  check('copied multisite guards have no false overlaps', initial.run.problems.filter((p) => p.code === 'MULTIPLE_PRIMARY_SITES').length, 0);
  assert.ok(initial.records.length >= 3, 'Need three copied payroll records');
  const table = await StatutoryService.getTaxTableForPeriod(new Date('2026-10-01'));
  const pension = await StatutoryService.getPensionRuleForPeriod(new Date('2026-10-01'));
  assert.ok(table && pension);
  // Independent marginal-band arithmetic, deliberately not calling the engine/statutory calculation.
  const tax = (base: number) => r2(table.brackets.reduce((n, b) => n + Math.max(0, Math.min(base, b.max ?? Infinity) - b.min) * b.rate / 100, 0));
  evidence.taxConfiguration = table.toObject(); evidence.pensionConfiguration = pension.toObject();
  const ordered = [...initial.records].sort((a, b) => a.additionalSites.length - b.additionalSites.length);
  const selected = [ordered[0], ordered.find((r) => r.additionalSites.length === 1) || ordered[1], ordered[ordered.length - 1]];
  const reconciliations = [];
  for (const record of selected) {
    const p = record.primarySite;
    const feedRow = feed.guards.find((g) => g.guardId === record.employeeId.toString());
    const inputHours = feedRow?.sites.find((s) => s.siteId === p.siteId.toString());
    check(`primary hours ${record.snapshot.employeeCode}`, [p.normalHours, p.sundayHours, p.holidayHours], [inputHours?.normalHours || 0, inputHours?.sundayHours || 0, inputHours?.holidayHours || 0]);
    const ot = Math.round(p.compensationAmount / p.standardMonthlyHours * 10000) / 10000;
    const structural = r2(ot * p.sundayStructuralHours);
    const remaining = r2(p.compensationAmount - structural);
    const transport = r2(remaining * p.transportPercent / 100);
    const basic = r2(remaining - transport);
    const hourly = Math.round(basic / p.basicHourlyDivisor * 10000) / 10000;
    const normalPay = r2(p.normalHours * hourly);
    const additional = r2(record.additionalSites.reduce((n, s) => {
      const ownOT = Math.round(s.compensationAmount / p.standardMonthlyHours * 10000) / 10000;
      const expected = r2((s.normalHours + s.sundayHours + s.holidayHours) * ownOT);
      check(`own-site earnings ${record.snapshot.employeeCode}/${s.siteCode}`, s.siteEarnings, expected);
      return n + expected;
    }, 0));
    const taxable = r2(normalPay + r2(p.sundayHours * ot) + r2(p.holidayHours * ot) + additional);
    const gross = r2(taxable + (p.normalHours + p.sundayHours + p.holidayHours > 0 ? transport : 0));
    const pensionBase = record.snapshot.pensionEnrolled ? normalPay : 0;
    const capped = Math.min(Math.max(pensionBase, pension.minPensionableSalary ?? 0), pension.maxPensionableSalary ?? Infinity);
    const employeePension = pensionBase > 0 ? r2(capped * pension.employeePercent / 100) : 0;
    const employerPension = pensionBase > 0 ? r2(capped * pension.employerPercent / 100) : 0;
    const other = r2(record.deductions.reduce((n, d) => n + d.amount, 0));
    const expected = { gross, taxable, pensionBase, employeePension, employerPension, tax: tax(taxable), other, net: r2(gross - employeePension - tax(taxable) - other) };
    const actual = { gross: record.grossEarnings, taxable: record.taxableEarnings, pensionBase: record.pensionBase, employeePension: record.employeePension, employerPension: record.employerPension, tax: record.incomeTax, other: record.totalDeductions, net: record.netPay };
    check(`independent financial reconciliation ${record.snapshot.employeeCode}`, actual, expected);
    const slip = await Payroll.getPayslip(record._id.toString());
    check('payslip net', slip.netPay, expected.net);
    check('payslip saved rates exposed', [slip.earnings.primarySite.compensationAmount, slip.earnings.primarySite.otRate, slip.earnings.primarySite.basicHourlyRate], [p.compensationAmount, p.otRate, p.basicHourlyRate]);
    const savedAttendance = initial.attendance.rows.find((r) => r.employeeId === record.employeeId.toString());
    check('run summary exposes saved site names and hours', savedAttendance?.sites[0].siteName, p.siteName);
    check('run summary saved primary normal hours', savedAttendance?.sites[0].normalHours, p.normalHours);
    check('payslip total withholding', slip.deductions.totalDeductions, r2(expected.other + expected.employeePension + expected.tax));
    check('payslip bases', [slip.pensionBase, slip.taxableEarnings], [expected.pensionBase, expected.taxable]);
    reconciliations.push({ employeeId: record.employeeId, employeeCode: record.snapshot.employeeCode, recordId: record._id, primary: p, additionalSites: record.additionalSites, expected, actual });
  }
  evidence.reconciliations = reconciliations;
  check('run net equals individual sum', initial.run.totals.netPay, r2(initial.records.reduce((n, r) => n + r.netPay, 0)));
  await rejects('unapproved bank export blocked', () => Payroll.exportBankDisbursement(initial.run._id.toString()));
  await rejects('staff tax relabel rejected', () => Payroll.exportTaxReport(initial.run._id.toString(), 'STAFF'));
  await rejects('staff pension relabel rejected', () => Payroll.exportPensionReport(initial.run._id.toString(), 'STAFF'));

  const guard = initial.records[0];
  const primary = await PrimarySiteAssignment.findOne({ guardId: guard.employeeId, isPrimary: true }); assert.ok(primary);
  const duplicate = await PrimarySiteAssignment.create({ ...primary.toObject(), _id: new mongoose.Types.ObjectId() });
  const conflict = await Payroll.calculate(period, userId);
  check('true duplicate produces one blocking guard problem', conflict.run.problems.filter((p) => p.employeeId.toString() === guard.employeeId.toString() && p.code === 'MULTIPLE_PRIMARY_SITES').length, 1);
  check('ambiguous guard receives no payroll', conflict.records.some((r) => r.employeeId.toString() === guard.employeeId.toString()), false);
  await rejects('duplicate primary blocks submission', () => Payroll.submit(conflict.run._id.toString(), userId));
  await GuardService.correctAssignment(duplicate._id.toString(), { effectiveFrom: duplicate.effectiveFrom.toISOString().slice(0, 10), effectiveTo: null, isPrimary: false, reason: 'Isolated regression: confirmed duplicate primary flag' }, { userId });
  check('correction preserves assignment ID', !!await PrimarySiteAssignment.findById(duplicate._id), true);
  await duplicate.deleteOne(); // isolated fixture only

  // Add a daily Sunday at a site without a sheet: an existing sheet elsewhere must not hide it.
  const otherSite = await mongoose.connection.db!.collection('sites').findOne({ _id: { $ne: guard.primarySite.siteId } }); assert.ok(otherSite);
  await GuardMonthlyHours.deleteMany({ guardId: guard.employeeId, siteId: otherSite._id, periodKey: period });
  await GuardAttendanceRecord.create({ guardId: guard.employeeId, siteId: otherSite._id, date: '2026-10-04', periodKey: period, dayOfMonth: 4, hoursWorked: 8, isHoliday: false, status: 'ACTIVE', source: 'OPERATIONS_EDIT', recordedBy: userId, updatedBy: userId });
  const mixed = await Hours.getPayrollHours(2026, 10, guard.employeeId.toString());
  check('cross-site Sunday fallback retained', mixed.guards[0].sites.find((s) => s.siteId === otherSite._id.toString())?.sundayHours, 8);
  evidence.mixedAttendance = mixed;
  const compensations = await GuardSiteCompensation.find({ siteId: otherSite._id });
  await GuardSiteCompensation.deleteMany({ siteId: otherSite._id });
  const missing = await Payroll.calculate(period, userId);
  check('missing additional rate is recorded', missing.run.problems.some((p) => p.employeeId.toString() === guard.employeeId.toString() && p.code === 'NO_ADDITIONAL_SITE_COMPENSATION'), true);
  check('missing additional rate does not yield partial pay', missing.records.some((r) => r.employeeId.toString() === guard.employeeId.toString()), false);
  if (compensations.length) await GuardSiteCompensation.insertMany(compensations.map((c) => c.toObject()));
  await GuardAttendanceRecord.deleteOne({ guardId: guard.employeeId, siteId: otherSite._id, date: '2026-10-04' });
  let final = await Payroll.calculate(period, userId);
  // Source issues remain visible. Only repair missing rates in the isolated copy, never source.
  if (final.run.problems.length) {
    evidence.sourceBlockingIssues = final.run.problems;
    assert.ok(final.run.problems.every((p) => p.code === 'NO_ADDITIONAL_SITE_COMPENSATION'), 'Unexpected source problem');
    await rejects('source missing rates block submission', () => Payroll.submit(final.run._id.toString(), userId));
    const siteIds = new Set((await Hours.getPayrollHours(2026, 10)).guards.flatMap((g) => g.sites.map((s) => s.siteId)));
    for (const siteId of siteIds) {
      if (!await GuardSiteCompensation.exists({ siteId })) {
        await GuardSiteCompensation.create({ siteId, compensationAmount: 12000, effectiveFrom: new Date('2026-01-01'), isCurrent: true, createdBy: userId, notes: 'ISOLATED TEST FIXTURE ONLY: not an approved production rate' });
      }
    }
    final = await Payroll.calculate(period, userId);
    check('explicit isolated missing-rate fixture resolves blockers', final.run.problems.length, 0);
  }
  const runId = final.run._id.toString();
  const count = await GuardPayrollRecord.countDocuments({ runId });
  await Payroll.calculate(period, userId);
  check('recalculation record count stable', await GuardPayrollRecord.countDocuments({ runId }), count);
  const loan = await EmployeeDeduction.create({ employeeId: final.records[0].employeeId, type: 'LOAN', label: 'ISOLATED loan regression', totalAmount: 1000, remainingBalance: 1000, monthlyInstallment: 100, startDate: new Date('2026-01-01'), status: 'ACTIVE', createdBy: userId });
  const before = await EmployeeDeduction.find().lean();
  // Source guards have missing bank details. Verify rejection, then use clearly fake isolated accounts.
  await Employee.updateMany({ category: 'GUARD' }, { $set: { bankName: 'ISOLATED TEST BANK', accountNumber: 'TEST-NOT-A-REAL-ACCOUNT' } });
  await Payroll.calculate(period, userId);
  await Payroll.submit(runId, userId); await Payroll.check(runId, userId);
  const approvals = await Promise.allSettled([Payroll.approve(runId, userId), Payroll.approve(runId, userId)]);
  check('concurrent approval exactly one success', approvals.filter((r) => r.status === 'fulfilled').length, 1);
  check('loan settled exactly once under concurrent approval', (await EmployeeDeduction.findById(loan._id))?.remainingBalance, 900);
  await Payroll.returnForCorrection(runId, 'Isolated deduction rollback test', userId);
  check('return restores loan balance once', (await EmployeeDeduction.findById(loan._id))?.remainingBalance, 1000);
  await rejects('repeated return cannot duplicate balance restoration', () => Payroll.returnForCorrection(runId, 'isolated', userId));
  await Payroll.calculate(period, userId); await Payroll.submit(runId, userId); await Payroll.check(runId, userId); await Payroll.approve(runId, userId);
  check('reapproval settles one installment', (await EmployeeDeduction.findById(loan._id))?.remainingBalance, 900);
  const settled = await EmployeeDeduction.find().lean();
  await rejects('finalized recalculation blocked', () => Payroll.calculate(period, userId));
  const approved = await Payroll.getRun(runId);
  const firstRecord = approved.records[0];
  await GuardPayrollRecord.updateOne({ _id: firstRecord._id }, { $unset: { 'snapshot.bankName': 1 } });
  await rejects('missing bank blocks approved instructions', () => Payroll.exportBankDisbursement(runId));
  await GuardPayrollRecord.updateOne({ _id: firstRecord._id }, { $set: { 'snapshot.bankName': 'ISOLATED TEST BANK' } });
  const bank = await Payroll.exportBankDisbursement(runId);
  const lines = bank.csv.split('\n').slice(1);
  check('bank instruction count', lines.length, count);
  check('bank amount equals run net', r2(lines.reduce((n, line) => n + Number(line.match(/,"?([\d.-]+)"?,"PAY-/)?.[1] || 0), 0)), approved.run.totals.netPay);
  check('repeat export deterministic (not execution)', (await Payroll.exportBankDisbursement(runId)).csv, bank.csv);
  const taxReport = await Payroll.exportTaxReport(runId);
  const pensionReport = await Payroll.exportPensionReport(runId);
  const taxRows = taxReport.csv.split('\n').slice(1).map((line) => line.split(','));
  const pensionRows = pensionReport.csv.split('\n').slice(1).map((line) => line.split(','));
  check('tax center sum', r2(taxRows.reduce((n, row) => n + Number(row[6]), 0)), approved.run.totals.incomeTax);
  check('pension center employee sum', r2(pensionRows.reduce((n, row) => n + Number(row[5]), 0)), approved.run.totals.employeePension);
  check('pension center employer sum', r2(pensionRows.reduce((n, row) => n + Number(row[6]), 0)), approved.run.totals.employerPension);
  const snapshotBefore = (await Payroll.getRun(runId)).records.map((r) => r.toObject());
  await GuardSiteCompensation.updateMany({}, { $inc: { compensationAmount: 123 } });
  await Contract.updateMany({}, { $inc: { wage: 456 } });
  check('financial snapshots unchanged after source rate/contract edits', (await Payroll.getRun(runId)).records.map((r) => r.toObject()), snapshotBefore);
  await rejects('payment requires confirmed reference', () => Payroll.markPaid(runId, '', userId));
  // This is a manual status transition in an isolated DB, NOT a bank payment.
  await Payroll.markPaid(runId, 'ISOLATED-STATUS-TEST-NO-BANK-EXECUTION', userId);
  await rejects('repeated mark-paid rejected', () => Payroll.markPaid(runId, 'ISOLATED', userId));
  await rejects('paid run cannot return', () => Payroll.returnForCorrection(runId, 'isolated', userId));
  // Isolated additional edge cases, preserving the finalized October run.
  const edgePeriod = '2026-09';
  await GuardMonthlyHours.deleteMany({ periodKey: edgePeriod });
  await GuardAttendanceRecord.deleteMany({ periodKey: edgePeriod });
  const zero = await Payroll.calculate(edgePeriod, userId);
  check('zero attendance never generates earnings', zero.records.every((r) => r.grossEarnings === 0 && r.employeePension === 0 && r.incomeTax === 0), true);
  check('zero primary hours never earn transport', zero.records.every((r) => r.primarySite.transportPaid === 0), true);
  const historical = await PrimarySiteAssignment.findOne({ guardId: guard.employeeId, isPrimary: true }); assert.ok(historical);
  historical.isCurrent = false; historical.effectiveTo = new Date('2026-09-30'); await historical.save();
  const historicalSite = historical.siteId.toString();
  const entries = await Attendance.saveEntry({ siteId: historicalSite, date: '2026-09-06', entry: { guardId: guard.employeeId.toString(), hoursWorked: 8 }, userId });
  await Attendance.saveEntry({ siteId: historicalSite, date: '2026-09-07', entry: { guardId: guard.employeeId.toString(), hoursWorked: 8, isHoliday: true }, userId });
  const edgeHours = await Hours.getPayrollHours(2026, 9, guard.employeeId.toString());
  check('ended historical assignment accepts valid dated attendance', entries.created, true);
  check('daily Sunday and holiday classified separately', [edgeHours.guards[0].totals.sundayHours, edgeHours.guards[0].totals.holidayHours, edgeHours.guards[0].totals.normalHours], [8, 8, 0]);
  await rejects('duplicate active attendance blocked by index', () => GuardAttendanceRecord.create({ ...entries.record.toObject(), _id: new mongoose.Types.ObjectId() }));
  await rejects('attendance outside historical interval rejected', () => Attendance.saveEntry({ siteId: historicalSite, date: '2026-10-10', entry: { guardId: guard.employeeId.toString(), hoursWorked: 8 }, userId }));
  const edgeRun = await Payroll.calculate(edgePeriod, userId);
  const edgeRecord = edgeRun.records.find((r) => r.employeeId.toString() === guard.employeeId.toString()); assert.ok(edgeRecord);
  check('holiday/Sunday-only attendance has zero pension base', edgeRecord.pensionBase, 0);
  await Contract.updateMany({ employeeId: guard.employeeId }, { $set: { pensionEnrolled: false } });
  const optOut = await Payroll.calculate(edgePeriod, userId);
  check('pension opt-out has zero employee/employer contributions', optOut.records.filter((r) => r.employeeId.toString() === guard.employeeId.toString()).every((r) => r.employeePension === 0 && r.employerPension === 0), true);
  evidence.workflow = { runId, bankRows: lines.length, bankTotal: approved.run.totals.netPay, taxTotal: approved.run.totals.incomeTax, employeePension: approved.run.totals.employeePension, employerPension: approved.run.totals.employerPension, deductionBefore: before.map((d) => ({ id: d._id, balance: d.remainingBalance })), deductionAfter: settled.map((d) => ({ id: d._id, balance: d.remainingBalance })) };
  evidence.checks = checks;
}
main().catch((error) => { evidence.failure = error.message; console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.resolve('../Documentation/Guard-Payroll-Reconciliation-2026-10-11.json'), JSON.stringify(evidence, null, 2));
  await mongoose.disconnect();
});
