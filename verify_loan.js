const http = require('http');
const mongoose = require('mongoose');
function api(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 5000, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(b) }); } catch (e) { resolve({ status: res.statusCode, raw: b }); } }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
function login(email) { return api('POST', '/api/auth/login', null, { email, password: 'password123' }).then(r => r.data?.data?.token || ''); }

async function main() {
  const fin = await login('finance@vitalpayroll.com');
  const head = await login('head@vitalpayroll.com');
  const hr = await login('hr@vitalpayroll.com');
  let pass = 0, fail = 0;
  const check = (name, cond, detail) => {
    if (cond) { pass++; console.log('  PASS ' + name); }
    else { fail++; console.log('  FAIL ' + name + ' :: ' + detail); }
  };

  await mongoose.connect('mongodb://127.0.0.1:27017/vitalpayroll');
  const Loan = mongoose.connection.db.collection('loans');

  // Pick an office staff employee with an ACTIVE contract
  const contracts = await mongoose.connection.db.collection('contracts').find({ status: 'ACTIVE' }).toArray();
  const emp130 = await mongoose.connection.db.collection('employees').findOne({ employeeCode: 'VSP-130' });
  const staffContract = contracts.find(c => c.salaryStructureId && c.employeeId.toString() === emp130._id.toString());
  if (!staffContract) { console.log('SKIP: no staff contract with structure'); process.exit(2); }
  const empId = staffContract.employeeId.toString();
  const emp = await mongoose.connection.db.collection('employees').findOne({ _id: staffContract.employeeId });
  console.log('Loan test employee:', emp.employeeCode, emp.firstName, emp.lastName, '| contract wage:', staffContract.wage);

  // Clean any prior test loans for this employee
  await Loan.deleteMany({ employeeId: staffContract.employeeId, notes: 'TIER0-LOAN-TEST' });

  // 1) Create loan directly (no loan CRUD route exists)
  await Loan.insertOne({
    employeeId: staffContract.employeeId, totalAmount: 10000, paidAmount: 0, balance: 10000,
    monthlyDeduction: 1000, status: 'ACTIVE', startDate: new Date('2024-01-01'), notes: 'TIER0-LOAN-TEST',
  });
  console.log('  loan created: balance=10000 monthly=1000');

  // 2) Create + lock a November 2026 period (future, harmless; covered by the
  // test employee's contract which started 2026-09-01 with no end).
  const created = await api('POST', '/api/finance/periods', fin, {
    year: 2026, month: 11, monthName: 'November',
    startDate: new Date('2026-11-01').toISOString(), endDate: new Date('2026-11-30T23:59:59.999').toISOString(),
  });
  console.log('  create period:', created.status, JSON.stringify(created.data).slice(0, 160));
  const p = { _id: '6aaa66cacc650a9e055302b2', monthName: 'November', status: 'DRAFT' };
  console.log('  using period:', p._id, p.status);
  {
    const cur = await api('GET', '/api/finance/periods/' + p._id, hr);
    p.status = cur.data?.data?.status || cur.data?.status || p.status;
    for (const s of ['OPEN', 'CLOSED']) {
      const cur2 = await api('GET', '/api/finance/periods/' + p._id, hr);
      const st = cur2.data?.data?.status || cur2.data?.status;
      if (st === 'LOCKED' || st === s) continue;
      const tr = await api('PUT', '/api/finance/periods/' + p._id + '/status', fin, { status: s });
      console.log('  -> ' + s + ':', tr.status, JSON.stringify(tr.data).slice(0, 100));
    }
    const lock = await api('PUT', '/api/finance/periods/' + p._id + '/lock', fin);
    console.log('  lock:', lock.status, JSON.stringify(lock.data).slice(0, 120));
  }

  // 3) Generate staff payroll for the period
  const gen = await api('POST', '/api/office-payroll/generate/' + p._id, fin);
  console.log('  generate:', gen.status, 'records=', gen.data?.data?.length, 'skipped=', (gen.data?.skipped || []).length);

  const recs = await api('GET', '/api/office-payroll?payrollPeriodId=' + p._id + '&limit=50', hr);
  const mine = (recs.data?.data || []).find(r => ((r.employeeId?._id || r.employeeId) || '').toString() === empId);
  check('staff record generated with loan snapshot', !!mine && mine.loanDeduction === 1000, 'loanDeduction=' + (mine && mine.loanDeduction));

  // 4) THE T0.1 ASSERTION: loan balance must be UNCHANGED after generation
  const loanAfterGen = await Loan.findOne({ employeeId: staffContract.employeeId, notes: 'TIER0-LOAN-TEST' });
  check('loan balance untouched by generation', loanAfterGen.balance === 10000 && loanAfterGen.paidAmount === 0,
    'balance=' + loanAfterGen.balance + ' paid=' + loanAfterGen.paidAmount);

  // 5) Run to PAID
  const id = mine._id;
  await api('POST', '/api/office-payroll/' + id + '/calculate', fin);
  await api('POST', '/api/office-payroll/' + id + '/submit', fin);
  await api('POST', '/api/office-payroll/' + id + '/check', fin);
  await api('POST', '/api/office-payroll/' + id + '/approve', head);
  await api('POST', '/api/office-payroll/' + id + '/initiate-payment', fin);
  const paid = await api('POST', '/api/office-payroll/' + id + '/confirm-paid', fin,
    { paymentMethod: 'BANK_TRANSFER', bankReference: 'TIER0-LOAN', paymentDate: new Date().toISOString() });
  check('confirm-paid succeeds', paid.status === 200 && paid.data?.success, 'status=' + paid.status);

  // 6) THE T0.1 ASSERTION: loan balance decreased exactly at PAID
  const loanAfterPaid = await Loan.findOne({ employeeId: staffContract.employeeId, notes: 'TIER0-LOAN-TEST' });
  check('loan balance decreased by deduction at PAID', loanAfterPaid.balance === 9000 && loanAfterPaid.paidAmount === 1000,
    'balance=' + loanAfterPaid.balance + ' paid=' + loanAfterPaid.paidAmount);

  const finalRec = (await api('GET', '/api/office-payroll/' + id, hr)).data?.data;
  check('record PAID', finalRec.status === 'PAID', 'status=' + finalRec.status);
  check('deduction flowed into totals', finalRec.totalDeductions >= 1000, 'total=' + finalRec.totalDeductions);

  // 7) Guard chain to PAID with new confirmPaid (journal + atomicity)
  console.log('== guard chain ==');
  const gp = await api('GET', '/api/guard-payroll?limit=50', hr);
  const g = (gp.data?.data || []).find(r => ['DRAFT', 'RETURNED', 'CALCULATED'].includes(r.status));
  if (!g) console.log('  SKIP: no stageable guard record');
  else {
    const gid = g._id;
    let cur = (await api('GET', '/api/guard-payroll/' + gid, hr)).data?.data;
    if (cur.status === 'DRAFT' || cur.status === 'RETURNED') await api('POST', '/api/guard-payroll/' + gid + '/calculate', fin);
    cur = (await api('GET', '/api/guard-payroll/' + gid, hr)).data?.data;
    if (cur.status === 'CALCULATED') await api('POST', '/api/guard-payroll/' + gid + '/submit', fin);
    cur = (await api('GET', '/api/guard-payroll/' + gid, hr)).data?.data;
    if (cur.status === 'SUBMITTED') await api('POST', '/api/guard-payroll/' + gid + '/check', fin);
    cur = (await api('GET', '/api/guard-payroll/' + gid, hr)).data?.data;
    if (cur.status === 'CHECKED') await api('POST', '/api/guard-payroll/' + gid + '/approve', head);
    await api('POST', '/api/guard-payroll/' + gid + '/initiate-payment', fin);
    const gpaid = await api('POST', '/api/guard-payroll/' + gid + '/confirm-paid', fin,
      { paymentMethod: 'BANK_TRANSFER', bankReference: 'TIER0-GUARD', paymentDate: new Date().toISOString() });
    check('guard confirm-paid succeeds', gpaid.status === 200 && gpaid.data?.success, 'status=' + gpaid.status);
    const gf = (await api('GET', '/api/guard-payroll/' + gid, hr)).data?.data;
    check('guard record PAID', gf.status === 'PAID', 'status=' + gf.status);
    console.log('  guard figures:', JSON.stringify({ gross: gf.grossPay, net: gf.netPay, tax: gf.incomeTax, pen: gf.employeePension }));
  }

  // cleanup test loan + test period records? Keep loan for ledger reality (it was really repaid).
  console.log('\nRESULT: pass=' + pass + ' fail=' + fail);
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error('ERR:', e); process.exit(2); });
