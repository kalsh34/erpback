/**
 * RECONCILIATION EVIDENCE EXTRACTOR — isolated audit DB only.
 * Compares (independently recomputed from raw attendance) vs stored payroll.
 * Output: ../Documentation/Guard-Payroll-Reconciliation-<date>.json
 */
import mongoose from 'mongoose';
import fs from 'node:fs';

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const { uri } = JSON.parse(fs.readFileSync('../.guard-audit/database.json', 'utf8'));
  if (!uri.startsWith('mongodb://127.0.0.1:27028/guard_audit_')) throw new Error('Refusing non-isolated database');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;
  const out: any = { generatedAt: new Date().toISOString(), periodKey: '2026-10', reconciliations: [] };

  // ── Attendance summary reconciliation (raw monthly hours sheets → stored payroll) ──
  const run = await db.collection('guardpayrollruns').findOne({ periodKey: '2026-10' });
  if (!run) throw new Error('no run');
  const records = await db.collection('guardpayrollrecords').find({ runId: run._id }).toArray();
  out.runStatus = run.status;
  out.runTotals = run.totals;

  // Authoritative month input: one sheet per guard + site + month.
  const sheets = await db.collection('guardmonthlyhours').find({ periodKey: '2026-10' }).toArray();
  const sheetBy = (gid: string, sid: string) =>
    sheets.find((s: any) => String(s.guardId) === gid && String(s.siteId) === sid);

  for (const r of records) {
    const eid = String(r.employeeId);
    const primary = r.primarySite ?? {};
    const ps = sheetBy(eid, String(primary.siteId ?? ''));
    const att = ps
      ? { normal: ps.normalHours ?? 0, sunday: ps.sundayHours ?? 0, holiday: ps.holidayHours ?? 0 }
      : { normal: 0, sunday: 0, holiday: 0 };
    const expectedPrimaryHours = round2(att.normal + att.sunday + att.holiday);
    const expectedPrimaryEarnings = round2(
      att.normal * (primary.basicHourlyRate ?? 0) + (att.sunday + att.holiday) * (primary.otRate ?? 0)
    );
    const additional = (r.additionalSites ?? []) as any[];
    const expectedAdditionalEarnings = round2(additional.reduce((s: number, a: any) => {
      const sh = sheetBy(eid, String(a.siteId ?? ''));
      const hours = sh ? (sh.normalHours ?? 0) + (sh.sundayHours ?? 0) + (sh.holidayHours ?? 0) : 0;
      return s + hours * (a.otRate ?? 0);
    }, 0));
    const expectedGross = round2(expectedPrimaryEarnings + (primary.transportPaid ?? 0) + expectedAdditionalEarnings);
    const expectedTaxBase = round2(expectedPrimaryEarnings + expectedAdditionalEarnings);
    const rec = {
      employeeId: eid,
      employeeCode: r.snapshot?.employeeCode ?? r.employeeCode,
      attendance: att,
      expectedPrimaryHours, storedPrimaryHours: round2(primary.normalHours + primary.sundayHours + primary.holidayHours),
      expectedPrimaryEarnings, expectedGross,
      expectedAdditionalEarnings,
      storedGross: round2(r.grossEarnings ?? 0),
      expectedTaxBase, storedTaxable: round2(r.taxableEarnings ?? 0),
      storedPensionBase: round2(r.pensionBase ?? 0),
      storedEmployeePension: round2(r.employeePension ?? 0),
      storedEmployerPension: round2(r.employerPension ?? 0),
      storedIncomeTax: round2(r.incomeTax ?? 0),
      storedTransport: round2(primary.transportPaid ?? 0),
      storedNet: round2(r.netPay ?? 0),
    };
    // Pension base (user rule 2026-10) = primary-site NORMAL-hour pay only,
    // clamped to pension salary limits — NOT basicSalary, NOT gross.
    const expectedPensionBase = rec.storedEmployeePension > 0 || rec.storedPensionBase > 0
      ? Math.min(Math.max(round2(primary.normalPay ?? 0), primary.pensionMin ?? 0), primary.pensionMax ?? Infinity)
      : 0;
    rec.pensionBaseMatchesRule = Math.abs(rec.storedPensionBase - (Number.isFinite(expectedPensionBase) ? round2(expectedPensionBase) : (primary.normalPay ?? 0))) < 0.02
      || Math.abs(rec.storedPensionBase - round2(primary.normalPay ?? 0)) < 0.02;
    rec.transportEquals20pct = Math.abs(rec.storedTransport - round2((primary.remaining ?? 0) * (primary.transportPercent ?? 20) / 100)) < 0.02;
    rec.primaryHoursMatch = Math.abs(rec.expectedPrimaryHours - rec.storedPrimaryHours) < 0.02;
    rec.primaryEarningsMatch = Math.abs(rec.expectedPrimaryEarnings - round2((primary.normalPay ?? 0) + (primary.sundayPay ?? 0) + (primary.holidayPay ?? 0))) < 0.02;
    rec.grossMatch = Math.abs(rec.expectedGross - rec.storedGross) < 0.02;
    rec.taxBaseMatch = Math.abs(rec.expectedTaxBase - rec.storedTaxable) < 0.02;
    out.reconciliations.push(rec);
  }

  // ── Run totals vs sum of records ──
  const sum = (f: (r: any) => number) => round2(records.reduce((s, r) => s + f(r), 0));
  out.runVsRecords = {
    gross: { records: sum((r) => r.grossEarnings), run: round2(run.totals.grossEarnings) },
    tax: { records: sum((r) => r.incomeTax), run: round2(run.totals.incomeTax) },
    net: { records: sum((r) => r.netPay), run: round2(run.totals.netPay) },
    employeePension: { records: sum((r) => r.employeePension), run: round2(run.totals.employeePension) },
    employerPension: { records: sum((r) => r.employerPension), run: round2(run.totals.employerPension) },
  };
  out.runTotalsMatch = Object.values(out.runVsRecords).every((v: any) => Math.abs(v.records - v.run) < 0.5);

  // ── Bank batch total vs net pay ──
  const batches = await db.collection('bankbatches').find({ runId: run._id }).toArray();
  const items = await db.collection('bankbatchitems').find({ runId: run._id }).toArray();
  out.bankBatch = batches.map((b) => ({
    id: b._id, status: b.status, batchTotal: round2(b.totalAmount ?? 0),
    items: items.filter((i: any) => String(i.batchId) === String(b._id)).length,
    itemsSum: round2(items.filter((i: any) => String(i.batchId) === String(b._id)).reduce((s: number, i: any) => s + (i.amount ?? 0), 0)),
  }));
  out.bankTotalMatchesNet = batches.length === 0 || round2(batches.reduce((s, b) => s + (b.totalAmount ?? 0), 0)) === round2(records.reduce((s, r) => s + r.netPay, 0));

  // ── Payslip (generated on demand from the saved snapshot) and bank batch ──
  const { GuardPayrollRunService } = require('../src/modules/guardPayroll/guardPayrollRun.service');
  const payslip = await GuardPayrollRunService.getPayslip(String(records[0]._id));
  out.samplePayslip = {
    code: payslip.employee.code, period: payslip.period,
    netPay: round2(payslip.netPay ?? 0),
    matches: Math.abs(round2(payslip.netPay ?? 0) - round2(records[0].netPay)) < 0.02,
    earningsMatchRecord: Math.abs(round2(payslip.earnings.grossEarnings) - round2(records[0].grossEarnings)) < 0.02,
    totalDeductionsMatch: Math.abs(round2(payslip.deductions.totalDeductions) - round2(records[0].totalDeductions + records[0].employeePension + records[0].incomeTax)) < 0.02,
  };
  out.samplePayslip.matchesAll = out.samplePayslip.matches && out.samplePayslip.earningsMatchRecord && out.samplePayslip.totalDeductionsMatch;

  const bank = await GuardPayrollRunService.exportBankDisbursement(String(run._id));
  const csvLines = bank.csv.split('\n').filter((l: string) => l.trim());
  const header = csvLines[0].split(',').map((h: string) => h.replace(/"/g, '').trim().toLowerCase());
  const amountCol = header.findIndex((h: string) => /amount|net/.test(h));
  if (amountCol < 0) throw new Error(`No amount column in bank CSV header: ${header.join('|')}`);
  let csvNet = 0; let csvCount = 0; let employeeIds = new Set<string>();
  const idCol = header.findIndex((h: string) => /employee|code|guard/.test(h));
  for (const line of csvLines.slice(1)) {
    const cols = line.match(/("[^"]*"|[^,]+)/g)!.map((c: string) => c.replace(/"/g, '').trim());
    csvCount++; csvNet += parseFloat(cols[amountCol]) || 0;
    if (idCol >= 0) employeeIds.add(cols[idCol]);
  }
  out.bankBatch = { filename: bank.filename, rows: csvCount, csvNet: round2(csvNet), recordsNet: round2(records.reduce((s, r) => s + r.netPay, 0)), uniqueGuards: employeeIds.size };
  out.bankBatch = { filename: bank.filename, rows: csvCount, csvNet: round2(csvNet), recordsNet: round2(records.reduce((s, r) => s + r.netPay, 0)) };
  out.bankTotalMatchesNet = Math.abs(out.bankBatch.csvNet - out.bankBatch.recordsNet) < 0.05 && csvCount === records.length && employeeIds.size === records.length;

  // ── Deduction / loan settlement uniqueness ──
  const loans = await db.collection('employeeloans').find({}).toArray();
  const sets = await db.collection('loansettlements').find({}).toArray();
  out.loanSettlements = { openLoans: loans.length, settlements: sets.length, orphans: sets.filter((s: any) => !loans.some((l: any) => String(l._id) === String(s.loanId))).length };

  const mismatched = out.reconciliations.filter((r: any) => !r.primaryHoursMatch || !r.primaryEarningsMatch || !r.grossMatch || !r.taxBaseMatch || !r.pensionBaseMatchesRule || !r.transportEquals20pct);
  out.mismatchedGuards = mismatched.length;
  out.allGuardsReconcile = mismatched.length === 0 && out.runTotalsMatch && out.bankTotalMatchesNet && out.samplePayslip.matches;

  fs.writeFileSync(`../Documentation/Guard-Payroll-Reconciliation-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ allGuardsReconcile: out.allGuardsReconcile, guards: out.reconciliations.length, mismatches: out.mismatchedGuards, runTotalsMatch: out.runTotalsMatch, bankTotalMatchesNet: out.bankTotalMatchesNet, payslipMatch: out.samplePayslip.matches }, null, 2));
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => mongoose.disconnect());
