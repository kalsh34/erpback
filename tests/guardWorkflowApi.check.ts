import http from 'node:http';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function request(method: string, route: string, token?: string, body?: unknown): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? '' : JSON.stringify(body);
    const req = http.request({ hostname: '127.0.0.1', port: 5018, path: `/api${route}`, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) } }, (res) => {
      let text = ''; res.on('data', (chunk) => text += chunk); res.on('end', () => resolve({ status: res.statusCode!, text }));
    });
    req.setTimeout(15000, () => req.destroy(new Error('HTTP timeout'))); req.on('error', reject); req.end(payload);
  });
}
async function main() {
  const { uri } = JSON.parse(fs.readFileSync('../.guard-audit/database.json', 'utf8'));
  if (!uri.startsWith('mongodb://127.0.0.1:27028/guard_audit_')) throw new Error('Refusing non-isolated database');
  await mongoose.connect(uri);
  const users = mongoose.connection.db!.collection('users');
  const password = `Isolated-${Date.now()}-only`;
  const hash = await bcrypt.hash(password, 10);
  const admin = await users.findOne({ role: 'SUPER_ADMIN' }); assert.ok(admin);
  const guard = await users.findOne({ role: 'GUARD' }); assert.ok(guard);
  await users.updateMany({ _id: { $in: [admin._id, guard._id] } }, { $set: { password: hash, isActive: true } });
  const login = async (email: string) => {
    const response = await request('POST', '/auth/login', undefined, { email, password });
    assert.equal(response.status, 200); return JSON.parse(response.text).data;
  };
  const adminSession = await login(admin.email); const guardSession = await login(guard.email);
  const results: { name: string; status: number }[] = [];
  async function check(name: string, route: string, token: string | undefined, expected: number, method = 'GET', body?: unknown) {
    const response = await request(method, route, token, body); assert.equal(response.status, expected, `${name}: ${response.text}`);
    results.push({ name, status: response.status }); console.log(`PASS HTTP ${name} ${expected}`); return response;
  }
  await check('unauthenticated payroll denied', '/guard-payroll/runs', undefined, 401);
  const runs = JSON.parse((await check('finance run list', '/guard-payroll/runs', adminSession.token, 200)).text).data;
  const run = runs.find((r: any) => r.periodKey === '2026-10'); assert.ok(run);
  const detail = JSON.parse((await check('saved run detail', `/guard-payroll/runs/${run._id}`, adminSession.token, 200)).text).data;
  const record = detail.records[0];
  await check('guard cannot list other payroll', '/guard-payroll/runs', guardSession.token, 403);
  await check('guard cannot inspect another record', `/guard-payroll/records/${record._id}`, guardSession.token, 403);
  await check('guard cannot inspect another payslip', `/guard-payroll/records/${record._id}/payslip`, guardSession.token, 403);
  await check('guard cannot export bank details', `/guard-payroll/runs/${run._id}/export/bank`, guardSession.token, 403);
  const own = JSON.parse((await check('guard own payroll', '/guard-payroll/my', guardSession.token, 200)).text).data;
  assert.ok(own.every((r: any) => r.employeeId === String(guard.employeeId)));
  await check('payslip snapshot', `/guard-payroll/records/${record._id}/payslip`, adminSession.token, 200);
  await check('bank instructions export', `/guard-payroll/runs/${run._id}/export/bank`, adminSession.token, 200);
  await check('tax register', `/guard-payroll/runs/${run._id}/export/tax`, adminSession.token, 200);
  await check('pension register', `/guard-payroll/runs/${run._id}/export/pension`, adminSession.token, 200);
  await check('false staff tax center rejected', `/guard-payroll/runs/${run._id}/export/tax?taxBranch=STAFF`, adminSession.token, 400);
  await check('finalized recalculation denied', `/guard-payroll/runs/${run._id}/recalculate`, adminSession.token, 409, 'POST');
  await check('repeat paid transition denied', `/guard-payroll/runs/${run._id}/pay`, adminSession.token, 409, 'POST', { paymentRef: 'ISOLATED-NO-EXECUTION' });
  await check('attendance summary', '/attendance/monthly?year=2026&month=10', adminSession.token, 200);
  fs.writeFileSync('../Documentation/Guard-Payroll-API-Verification-2026-10-11.json', JSON.stringify({ baseUrl: 'http://127.0.0.1:5018', isolatedOnly: true, results }, null, 2));
  console.log(`HTTP checks: ${results.length}`);
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => mongoose.disconnect());
