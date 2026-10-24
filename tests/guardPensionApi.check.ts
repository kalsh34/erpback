import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app';
import { Employee } from '../src/models/Employee';
import { User } from '../src/models/User';
import { Site } from '../src/models/Site';
import { Contract } from '../src/models/Contract';
import { PrimarySiteAssignment } from '../src/models/PrimarySiteAssignment';
import { GuardSiteCompensation } from '../src/models/GuardSiteCompensation';
import { GuardMonthlyHours } from '../src/models/GuardMonthlyHours';
import { GuardPayrollRecord } from '../src/models/GuardPayrollRecord';
import { TaxBracket } from '../src/models/TaxBracket';
import { PensionRule } from '../src/models/PensionRule';
import { registerCorePermissions } from '../src/core/permissions/core.permissions';
import { registerHRPermissions } from '../src/modules/hr/permissions/hr.permissions';
import { registerPayrollPermissions } from '../src/modules/hr/permissions/payroll.permissions';

async function main() {
  const database = `guard_pension_check_${Date.now()}`;
  // Never use the configured employee database or copy personal employee data.
  await mongoose.connect(`mongodb://127.0.0.1:27029/${database}?replicaSet=guardE2e`, { serverSelectionTimeoutMS: 5000 });
  registerCorePermissions(); registerHRPermissions(); registerPayrollPermissions();
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  const admin = await User.create({ email: 'pension-check@vital-test.invalid', password: await bcrypt.hash('PensionOnly-Test-2026!', 10), firstName: 'Pension', lastName: 'Test', role: 'SUPER_ADMIN' });
  const primary = await Site.create({ siteName: 'Pension Test Primary', siteCode: 'PENSION-P', location: 'Test only', siteType: 'COMMERCIAL', agreedManpower: 3, actualManpower: 3 });
  const secondary = await Site.create({ siteName: 'Pension Test Additional', siteCode: 'PENSION-A', location: 'Test only', siteType: 'COMMERCIAL', agreedManpower: 1, actualManpower: 1 });
  const start = new Date('2026-10-01T00:00:00.000Z');
  await GuardSiteCompensation.create([
    { siteId: primary._id, compensationAmount: 12000, effectiveFrom: start, createdBy: admin._id },
    { siteId: secondary._id, compensationAmount: 9000, effectiveFrom: start, createdBy: admin._id },
  ]);
  await TaxBracket.create({ name: 'Test tax', kind: 'GUARD', effectiveFrom: start, brackets: [{ min: 0, max: null, rate: 0 }] });
  await PensionRule.create({ name: 'Test pension', kind: 'GUARD', effectiveFrom: start, employeePercent: 7, employerPercent: 11 });
  const cases = [
    { code: 'PENSION-01', name: 'Normal Sunday', normal: 200, sunday: 24, holiday: 8, base: 9200, employee: 644, employer: 1012, gross: 12730, net: 12086 },
    { code: 'PENSION-02', name: 'Sunday Only', normal: 0, sunday: 8, holiday: 0, base: 400, employee: 28, employer: 44, gross: 2480, net: 2452 },
    { code: 'PENSION-03', name: 'Holiday Only', normal: 0, sunday: 0, holiday: 8, base: 0, employee: 0, employer: 0, gross: 2480, net: 2480 },
  ];
  for (const c of cases) {
    const employee = await Employee.create({ employeeCode: c.code, firstName: c.name, lastName: 'Fixture', category: 'GUARD', status: 'CONTRACTED', homeSiteId: primary._id, bankName: 'Test Bank', accountNumber: 'TEST-NOT-PAYABLE' });
    await Contract.create({ employeeId: employee._id, contractStartDate: start, wage: 12000, pensionEnrolled: true });
    await PrimarySiteAssignment.create({ guardId: employee._id, siteId: primary._id, isPrimary: true, effectiveFrom: start, standardMonthlyHours: 240, hourlyRate: 0 });
    await GuardMonthlyHours.create({ guardId: employee._id, siteId: primary._id, periodKey: '2026-10', normalHours: c.normal, sundayHours: c.sunday, holidayHours: c.holiday, recordedBy: admin._id });
    if (c.code === 'PENSION-01') {
      await PrimarySiteAssignment.create({ guardId: employee._id, siteId: secondary._id, isPrimary: false, effectiveFrom: start, standardMonthlyHours: 240, hourlyRate: 0 });
      await GuardMonthlyHours.create({ guardId: employee._id, siteId: secondary._id, periodKey: '2026-10', normalHours: 20, sundayHours: 4, holidayHours: 4, recordedBy: admin._id });
    }
  }
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(process.argv.includes('--serve') ? 5021 : 0, '127.0.0.1', () => resolve(listener));
    listener.on('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  let token = '';
  async function request(method: string, route: string, body?: unknown, expected = 200) {
    const response = await fetch(`${origin}/api${route}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
    const result = await response.json() as any;
    assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(result)}`);
    return result.data;
  }
  token = (await request('POST', '/auth/login', { email: admin.email, password: 'PensionOnly-Test-2026!' })).token;
  const calculated = await request('POST', '/guard-payroll/runs', { periodKey: '2026-10' }, 201);
  assert.deepEqual(calculated.run.problems, []);
  assert.equal(calculated.records.length, cases.length);
  for (const c of cases) {
    const record = calculated.records.find((r: any) => r.snapshot.employeeCode === c.code);
    assert.ok(record);
    assert.deepEqual([record.pensionBase, record.employeePension, record.employerPension, record.grossEarnings, record.netPay], [c.base, c.employee, c.employer, c.gross, c.net]);
    const saved = await GuardPayrollRecord.findById(record._id).lean(); assert.ok(saved);
    assert.equal(saved.pensionBase, c.base);
    const slip = await request('GET', `/guard-payroll/records/${record._id}/payslip`);
    assert.deepEqual([slip.pensionBase, slip.deductions.employeePension, slip.deductions.employerPension, slip.netPay], [c.base, c.employee, c.employer, c.net]);
    console.log(`PASS API + saved record + payslip ${c.code}: base ${c.base}, employee ${c.employee}, employer ${c.employer}`);
  }
  const runId = calculated.run._id;
  for (const action of ['submit', 'check', 'approve']) await request('POST', `/guard-payroll/runs/${runId}/${action}`);
  const report = await fetch(`${origin}/api/guard-payroll/runs/${runId}/export/pension`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(report.status, 200);
  const csv = await report.text();
  assert.ok(csv.includes('9200.00') && csv.includes('644.00') && csv.includes('1012.00'));
  const before = JSON.stringify(await GuardPayrollRecord.find({ runId }).sort({ _id: 1 }).lean());
  await request('POST', `/guard-payroll/runs/${runId}/recalculate`, undefined, 409);
  assert.equal(JSON.stringify(await GuardPayrollRecord.find({ runId }).sort({ _id: 1 }).lean()), before);
  fs.writeFileSync('../.guard-e2e/pension-api-result.json', JSON.stringify({ origin, pid: process.pid, database, runId, cases, payrollStatus: 'APPROVED', checks: 'calculate, saved snapshots, payslips, pension CSV, finalized recalculation rejection', sourceDatabaseWrites: 0 }, null, 2));
  console.log('PASS pension export and immutable approved snapshots');
  if (process.argv.includes('--serve')) console.log(`Pension test API ready on ${origin}; PID ${process.pid}`);
  else { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await mongoose.disconnect(); }
}
main().catch(async error => { console.error(error); process.exitCode = 1; await mongoose.disconnect(); process.exit(1); });
