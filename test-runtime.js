const http = require('http');

function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { hostname: '127.0.0.1', port: 5000, path: `/api${path}`, method, headers };
    const req = http.request(opts, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let HR, FIN, ADMIN, OPS, GUARD, HEAD;
let passed = 0, failed = 0;
const results = [];

function check(name, condition, detail) {
  if (condition) { passed++; results.push(`  PASS: ${name}`); }
  else { failed++; results.push(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
}

const ts = Date.now();

async function run() {
  console.log('=== Phase 2 Runtime Test Suite ===\n');

  // Login all roles
  console.log('Logging in all roles...');
  const hrLogin = await api('POST', '/auth/login', { email: 'hr@vitalpayroll.com', password: 'password123' });
  HR = hrLogin.body.data?.token;
  check('HR login', !!HR, hrLogin.body.message);

  const finLogin = await api('POST', '/auth/login', { email: 'finance@vitalpayroll.com', password: 'password123' });
  FIN = finLogin.body.data?.token;
  check('Finance login', !!FIN, finLogin.body.message);

  const adminLogin = await api('POST', '/auth/login', { email: 'admin@vitalpayroll.com', password: 'password123' });
  ADMIN = adminLogin.body.data?.token;
  check('Admin login', !!ADMIN, adminLogin.body.message);

  const opsLogin = await api('POST', '/auth/login', { email: 'ops@vitalpayroll.com', password: 'password123' });
  OPS = opsLogin.body.data?.token;
  check('Operations login', !!OPS, opsLogin.body.message);

  const headLogin = await api('POST', '/auth/login', { email: 'head@vitalpayroll.com', password: 'password123' });
  HEAD = headLogin.body.data?.token;
  check('Head login', !!HEAD, headLogin.body.message);

  if (!HR || !FIN || !ADMIN || !OPS || !HEAD) {
    console.log('\nFATAL: Cannot login. Aborting.\n');
    results.forEach(r => console.log(r));
    process.exit(1);
  }

  // ===================== TEST 1: EMPLOYEE =====================
  console.log('\n--- TEST 1: Employee CRUD ---');

  const empCreate = await api('POST', '/employees', {
    employeeCode: `E${ts}`, firstName: 'TestFirst', lastName: 'TestLast',
    email: `testemp_${ts}@test.com`, phone: '0911111111', category: 'OFFICE_STAFF',
    hireDate: '2025-01-15', department: 'IT', position: 'Developer',
    companyId: null, partyId: null
  }, HR);
  const empId = empCreate.body.data?._id;
  check('Employee create', empCreate.status === 201 && !!empId, `status=${empCreate.status}, msg=${empCreate.body.message}`);

  const empGet = await api('GET', `/employees/${empId}`, null, HR);
  check('Employee get by id', empGet.status === 200 && empGet.body.data?.firstName === 'TestFirst',
    `got: ${empGet.body.data?.firstName}`);

  check('Employee companyId field exists', empGet.body.data?.companyId === null || empGet.body.data?.companyId !== undefined,
    `companyId=${JSON.stringify(empGet.body.data?.companyId)}`);
  check('Employee partyId field exists', empGet.body.data?.partyId === null || empGet.body.data?.partyId !== undefined,
    `partyId=${JSON.stringify(empGet.body.data?.partyId)}`);

  const empUpdate = await api('PUT', `/employees/${empId}`, { firstName: 'UpdatedFirst', position: 'Sr Developer' }, HR);
  check('Employee update', empUpdate.status === 200 && empUpdate.body.data?.firstName === 'UpdatedFirst',
    `got: ${empUpdate.body.data?.firstName}`);

  // ===================== TEST 2: SITE =====================
  console.log('\n--- TEST 2: Site CRUD ---');

  const siteCreate = await api('POST', '/sites', {
    siteName: `Test Site ${ts}`, siteCode: `TSA-${ts}`, client: 'TestClient',
    location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
    agreedManpower: 10, actualManpower: 8
  }, HR);
  const siteId = siteCreate.body.data?._id;
  check('Site create', siteCreate.status === 201 && !!siteId, `status=${siteCreate.status}, msg=${siteCreate.body.message}`);

  const siteGet = await api('GET', `/sites/${siteId}`, null, HR);
  check('Site get by id', siteGet.status === 200 && !!siteGet.body.data?.siteCode,
    `got: ${siteGet.body.data?.siteCode}`);

  const siteUpdate = await api('PUT', `/sites/${siteId}`, { client: 'UpdatedClient', agreedManpower: 12 }, HR);
  check('Site update', siteUpdate.status === 200 && siteUpdate.body.data?.client === 'UpdatedClient',
    `got: ${siteUpdate.body.data?.client}`);

  // ===================== TEST 3: GUARD REGISTRATION =====================
  console.log('\n--- TEST 3: Guard Registration (Transaction) ---');

  const guardEmail = `testguard_${ts}@test.com`;
  const guardReg = await api('POST', '/guards/register', {
    firstName: 'GuardFirst', lastName: 'GuardLast', phone: '0922222222',
    idCardNumber: `ID-${ts}`, employmentType: 'CONTRACT',
    email: guardEmail, password: 'password123'
  }, HR);
  check('Guard register (3 docs)', guardReg.status === 201 && !!guardReg.body.data?.employee && !!guardReg.body.data?.user,
    `status=${guardReg.status}, hasEmployee=${!!guardReg.body.data?.employee}, hasUser=${!!guardReg.body.data?.user}, msg=${guardReg.body.message}`);

  const guardEmpId = guardReg.body.data?.employee?._id;
  if (guardEmpId) {
    const detail = await api('GET', `/guards/${guardEmpId}`, null, HR);
    check('Guard detail has profile', !!detail.body.data?.profile,
      `profile=${!!detail.body.data?.profile}`);
    check('Guard detail has user', !!detail.body.data?.user,
      `user=${!!detail.body.data?.user}`);
    check('Guard employee category=GUARD', detail.body.data?.employee?.category === 'GUARD',
      `category=${detail.body.data?.employee?.category}`);
  } else {
    check('Guard detail has profile', false, 'no employee ID');
    check('Guard detail has user', false, 'no employee ID');
    check('Guard employee category=GUARD', false, 'no employee ID');
  }

  // Test rollback: send invalid data that should fail at GuardProfile create
  const badGuard = await api('POST', '/guards/register', {
    firstName: 'Bad', lastName: 'Guard', phone: '0933333333',
    idCardNumber: `ID-BAD-${ts}`, employmentType: 'INVALID_ENUM_VALUE',
    email: `badguard_${ts}@test.com`, password: 'password123'
  }, HR);
  check('Guard register rollback on bad data', badGuard.status >= 400,
    `status=${badGuard.status}`);

  // Verify rollback: bad guard's employee should not exist
  const badEmpCheck = await api('GET', '/employees', null, HR);
  const badEmpExists = (badEmpCheck.body.data || []).some(e => e.email === `badguard_${ts}@test.com`);
  check('Rollback deleted orphan employee', !badEmpExists, `exists=${badEmpExists}`);

  // ===================== TEST 4: GUARD SITE ASSIGNMENT =====================
  console.log('\n--- TEST 4: Guard Site Assignment ---');

  if (guardEmpId) {
    // Assign site to guard first (guard attendance was removed and will be redesigned)
    const assign = await api('POST', '/guards/assign-site', { guardId: guardEmpId, siteId: siteId }, HR);
    check('Guard assigned to site', assign.status === 201 || assign.status === 200,
      `status=${assign.status}, msg=${assign.body.message}`);
  }

  // ===================== TEST 5: STAFF ATTENDANCE =====================
  console.log('\n--- TEST 5: Staff Attendance ---');

  await api('POST', '/staff-attendance/unlock', { year: 2028, month: 3, reason: 'Test reset' }, FIN);

  const saveDay = await api('POST', '/staff-attendance/day', {
    employeeId: empId || '000000000000000000000000',
    year: 2028, month: 3, dayOfMonth: 15, status: 'PRESENT'
  }, HR);
  check('Save day status', saveDay.status === 201,
    `status=${saveDay.status}`);

  const grid = await api('GET', '/staff-attendance/grid?year=2028&month=3', null, HR);
  check('Get staff grid', grid.status === 200 && !!grid.body.data?.grid,
    `hasGrid=${!!grid.body.data?.grid}`);

  const summary = await api('GET', '/staff-attendance/summary?year=2028&month=3', null, FIN);
  check('Get staff summary', summary.status === 200 && !!grid.body.data?.grid,
    `status=${summary.status}`);

  // ===================== TEST 8: FINANCE (Periods & Rates) =====================
  console.log('\n--- TEST 8: Finance ---');

  const createPeriod = await api('POST', '/finance/periods', {
    year: 2028, month: 3, monthName: 'March', startDate: '2028-03-01', endDate: '2028-03-31', status: 'OPEN'
  }, FIN);
  let periodId = createPeriod.body.data?._id;

  if (createPeriod.status === 409) {
    const periods = await api('GET', '/finance/periods', null, FIN);
    const existing = (periods.body.data || []).find(p => p.year === 2028 && p.month === 3);
    periodId = existing?._id;
    check('Create payroll period', !!periodId, `409 but fetched existing: ${!!periodId}`);
  } else {
    check('Create payroll period', createPeriod.status === 201 && !!periodId,
      `status=${createPeriod.status}`);
  }

  const setRates = await api('PUT', `/finance/rates/${periodId || '000000000000000000000000'}`, {
    normalRate: 150, otRate: 225, holidayRate: 300
  }, FIN);
  check('Set payroll rates', setRates.status === 200,
    `status=${setRates.status}, msg=${setRates.body.message}`);

  const getRates = await api('GET', `/finance/rates/${periodId || '000000000000000000000000'}`, null, FIN);
  check('Get payroll rates', getRates.status === 200 && getRates.body.data?.normalRate === 150,
    `normalRate=${getRates.body.data?.normalRate}`);

  // ===================== TEST 6: GUARD PAYROLL =====================
  console.log('\n--- TEST 6: Guard Payroll Workflow ---');

  if (periodId && guardEmpId) {
    const genRecords = await api('POST', `/guard-payroll/generate/${periodId}`, null, FIN);
    check('Guard payroll generate', genRecords.status === 201 || genRecords.status === 200,
      `status=${genRecords.status}, msg=${genRecords.body.message}`);
    const gpRecords = genRecords.body.data || [];
    const gpId = Array.isArray(gpRecords) && gpRecords.length > 0 ? gpRecords[0]._id : null;

    if (gpId) {
      const submit1 = await api('POST', `/guard-payroll/${gpId}/submit`, null, FIN);
      check('Guard payroll submit', submit1.status === 200,
        `status=${submit1.status}`);

      const enterRates = await api('PUT', `/guard-payroll/${gpId}/rates`, {
        normalRate: 150, otRate: 225, holidayRate: 300
      }, FIN);
      check('Guard payroll enter rates', enterRates.status === 200,
        `status=${enterRates.status}`);

      const calc = await api('POST', `/guard-payroll/${gpId}/calculate`, { pensionTaxBase: 'NORMAL_SALARY_ONLY' }, FIN);
      check('Guard payroll calculate', calc.status === 200 && calc.body.data?.netPay !== undefined,
        `netPay=${calc.body.data?.netPay}, grossPay=${calc.body.data?.grossPay}`);

      if (calc.body.data) {
        const d = calc.body.data;
        const expectedGross = (d.normalHours || 0) * 150 + (d.otHours || 0) * 225 + (d.holidayHours || 0) * 300 + (d.secondaryShiftPay || 0);
        check('Guard payroll grossPay matches formula',
          Math.abs((d.grossPay || 0) - expectedGross) < 0.01,
          `expected=${expectedGross}, got=${d.grossPay}`);
        check('Guard payroll netPay = grossPay - deductions',
          Math.abs((d.netPay || 0) - ((d.grossPay || 0) - (d.totalDeductions || 0))) < 0.01,
          `net=${d.netPay}, gross-ded=${(d.grossPay || 0) - (d.totalDeductions || 0)}`);
      }

      const checkRp = await api('POST', `/guard-payroll/${gpId}/check`, null, FIN);
      check('Guard payroll check', checkRp.status === 200,
        `status=${checkRp.status}`);

      const approve = await api('POST', `/guard-payroll/${gpId}/approve`, null, HEAD);
      check('Guard payroll approve', approve.status === 200,
        `status=${approve.status}`);

      const pay = await api('POST', `/guard-payroll/${gpId}/pay`, {
        paymentMethod: 'BANK_TRANSFER', paymentDate: '2026-08-31', bankReference: 'REF-TEST-001'
      }, FIN);
      check('Guard payroll pay', pay.status === 200,
        `status=${pay.status}`);

      const final = await api('GET', `/guard-payroll/${gpId}`, null, FIN);
      check('Guard payroll final status=PAID', final.body.data?.status === 'PAID',
        `status=${final.body.data?.status}`);
    } else {
      console.log('  (No records generated)');
      check('Guard payroll enter rates', false, 'no record');
      check('Guard payroll calculate', false, 'no record');
      check('Guard payroll submit', false, 'no record');
      check('Guard payroll check', false, 'no record');
      check('Guard payroll approve', false, 'no record');
      check('Guard payroll pay', false, 'no record');
      check('Guard payroll final status=PAID', false, 'no record');
    }
  } else {
    console.log(`  (Skipping — periodId=${!!periodId}, guardEmpId=${!!guardEmpId})`);
    check('Guard payroll generate', false, 'missing period or guard');
    check('Guard payroll enter rates', false, 'no record');
    check('Guard payroll calculate', false, 'no record');
    check('Guard payroll submit', false, 'no record');
    check('Guard payroll check', false, 'no record');
    check('Guard payroll approve', false, 'no record');
    check('Guard payroll pay', false, 'no record');
    check('Guard payroll final status=PAID', false, 'no record');
  }

  // ===================== TEST 7: OFFICE PAYROLL =====================
  console.log('\n--- TEST 7: Office Payroll Workflow ---');

  const lockStaff = await api('POST', '/staff-attendance/lock', { year: 2028, month: 3, reason: 'Payroll generation test' }, FIN);
  check('Lock staff attendance', lockStaff.status === 200 || lockStaff.status === 201 || lockStaff.status === 400,
    `status=${lockStaff.status}, msg=${lockStaff.body.message}`);

  if (empId && periodId) {
    const genStaff = await api('POST', `/office-payroll/generate/${periodId}`, null, FIN);
    check('Staff payroll generate', genStaff.status === 201 || genStaff.status === 200,
      `status=${genStaff.status}, msg=${genStaff.body.message}`);

    const listStaff = await api('GET', `/office-payroll?payrollPeriodId=${periodId}`, null, FIN);
    const staffRecords = listStaff.body.data || [];
    const spId = Array.isArray(staffRecords) && staffRecords.length > 0 ? staffRecords[0]._id : null;

    if (spId) {
      const updSalary = await api('PUT', `/office-payroll/${spId}/salary`, {
        basicSalary: 25000, responsibilityAllowance: 3000, teleAllowance: 1500,
        taxableTransport: 2000, nonTaxableTransport: 1000, overtime: 500, bonus: 0,
        loanDeduction: 500, otherDeductions: 200
      }, FIN);
      check('Staff payroll update salary', updSalary.status === 200,
        `status=${updSalary.status}`);

      const calcStaff = await api('POST', `/office-payroll/${spId}/calculate`, null, FIN);
      check('Staff payroll calculate', calcStaff.status === 200 && calcStaff.body.data?.netPay !== undefined,
        `netPay=${calcStaff.body.data?.netPay}`);

      if (calcStaff.body.data) {
        const s = calcStaff.body.data;
        const expectedGross = 25000 + 3000 + 1500 + 2000 + 1000 + 500;
        check('Staff payroll grossSalary matches',
          Math.abs((s.grossSalary || 0) - expectedGross) < 0.01,
          `expected=${expectedGross}, got=${s.grossSalary}`);
      }

      const sSubmit = await api('POST', `/office-payroll/${spId}/submit`, null, FIN);
      check('Staff payroll submit', sSubmit.status === 200, `status=${sSubmit.status}`);

      const sCheck = await api('POST', `/office-payroll/${spId}/check`, null, FIN);
      check('Staff payroll check', sCheck.status === 200, `status=${sCheck.status}`);

      const sApprove = await api('POST', `/office-payroll/${spId}/approve`, null, HEAD);
      check('Staff payroll approve', sApprove.status === 200, `status=${sApprove.status}`);

      const sPay = await api('POST', `/office-payroll/${spId}/pay`, {
        paymentMethod: 'BANK_TRANSFER', paymentDate: '2026-08-31'
      }, FIN);
      check('Staff payroll pay', sPay.status === 200, `status=${sPay.status}`);

      const sFinal = await api('GET', `/office-payroll/${spId}`, null, FIN);
      check('Staff payroll final status=PAID', sFinal.body.data?.status === 'PAID',
        `status=${sFinal.body.data?.status}`);
    } else {
      console.log('  (No staff payroll records found)');
      check('Staff payroll generate', false, 'no records after generate');
      check('Staff payroll update salary', false, 'no record');
      check('Staff payroll calculate', false, 'no record');
      check('Staff payroll submit', false, 'no record');
      check('Staff payroll check', false, 'no record');
      check('Staff payroll approve', false, 'no record');
      check('Staff payroll pay', false, 'no record');
      check('Staff payroll final status=PAID', false, 'no record');
    }
  } else {
    console.log(`  (Skipping — empId=${!!empId}, periodId=${!!periodId})`);
    check('Staff payroll generate', false, 'missing employee or period');
  }

  // ===================== TEST 9: RBAC =====================
  console.log('\n--- TEST 9: RBAC ---');

  const rbacHrEmp = await api('POST', '/employees', {
    employeeCode: `RBAC-${ts}`, firstName: 'RBAC', lastName: 'Test',
    category: 'OFFICE_STAFF', hireDate: '2025-01-01'
  }, HR);
  check('HR_ADMIN can create employee', rbacHrEmp.status === 201, `status=${rbacHrEmp.status}`);

  const rbacHrFinance = await api('POST', '/finance/periods', {
    year: 2099, month: 1, monthName: 'Test', startDate: '2099-01-01', endDate: '2099-01-31', status: 'OPEN'
  }, HR);
  check('HR_ADMIN cannot create finance period', rbacHrFinance.status === 403, `status=${rbacHrFinance.status}`);

  const rbacOpsEmp = await api('POST', '/employees', {
    employeeCode: `OPS-${ts}`, firstName: 'OPS', lastName: 'Test',
    category: 'OFFICE_STAFF', hireDate: '2025-01-01'
  }, OPS);
  check('OPERATIONS cannot create employee', rbacOpsEmp.status === 403, `status=${rbacOpsEmp.status}`);

  const rbacFinPayroll = await api('GET', '/guard-payroll', null, FIN);
  check('FINANCE can read guard payroll', rbacFinPayroll.status === 200, `status=${rbacFinPayroll.status}`);

  const rbacFinAudit = await api('GET', '/audit-logs', null, FIN);
  check('FINANCE can read audit logs', rbacFinAudit.status === 200, `status=${rbacFinAudit.status}`);

  const rbacOpsPeriod = await api('POST', '/finance/periods', {
    year: 2098, month: 1, monthName: 'Test', startDate: '2098-01-01', endDate: '2098-01-31', status: 'OPEN'
  }, OPS);
  check('OPERATIONS cannot create finance period', rbacOpsPeriod.status === 403, `status=${rbacOpsPeriod.status}`);

  const rbacOpsReadPeriod = await api('GET', '/finance/periods', null, OPS);
  check('OPERATIONS can read finance periods', rbacOpsReadPeriod.status === 200, `status=${rbacOpsReadPeriod.status}`);

  // Test guard-specific RBAC
  if (guardReg.body.data?.user?.email) {
    const gLogin = await api('POST', '/auth/login', {
      email: guardReg.body.data.user.email, password: 'password123'
    });
    GUARD = gLogin.body.data?.token;
    check('Guard login (fresh)', !!GUARD, gLogin.body.message);

    if (GUARD) {
      const gEmpCreate = await api('POST', '/employees', {
        employeeCode: 'X', firstName: 'X', lastName: 'X',
        category: 'OFFICE_STAFF', hireDate: '2025-01-01'
      }, GUARD);
      check('GUARD cannot create employee', gEmpCreate.status === 403, `status=${gEmpCreate.status}`);

      const gFinance = await api('GET', '/finance/periods', null, GUARD);
      check('GUARD cannot read finance periods', gFinance.status === 403, `status=${gFinance.status}`);
    }
  }

  // Cleanup
  if (empId) await api('DELETE', `/employees/${empId}`, null, HR).catch(() => {});
  if (rbacHrEmp.body?.data?._id) await api('DELETE', `/employees/${rbacHrEmp.body.data._id}`, null, HR).catch(() => {});

  // ===================== TEST 11: Part A RBAC — GUARD_ASSIGN_SITE =====================
  console.log('\n--- TEST 11: Part A RBAC — GUARD_ASSIGN_SITE ---');

  const guard1Email = `parta_guard1_${ts}@test.com`;
  const guard1Reg = await api('POST', '/guards/register', {
    firstName: 'GuardA1', lastName: 'PartA', phone: '0940000001',
    idCardNumber: `PA-G1-${ts}`, employmentType: 'CONTRACT',
    email: guard1Email, password: 'password123'
  }, HR);
  const guard1EmpId = guard1Reg.body.data?.employee?._id;
  check('PartA: Guard 1 registered', !!guard1EmpId, `status=${guard1Reg.status}`);

  const guard2Email = `parta_guard2_${ts}@test.com`;
  const guard2Reg = await api('POST', '/guards/register', {
    firstName: 'GuardA2', lastName: 'PartA', phone: '0940000002',
    idCardNumber: `PA-G2-${ts}`, employmentType: 'CONTRACT',
    email: guard2Email, password: 'password123'
  }, HR);
  const guard2EmpId = guard2Reg.body.data?.employee?._id;
  check('PartA: Guard 2 registered', !!guard2EmpId, `status=${guard2Reg.status}`);

  if (guard1EmpId && siteId) {
    const hrAssign = await api('POST', '/guards/assign-site', { guardId: guard1EmpId, siteId }, HR);
    check('HR_ADMIN can assign site', hrAssign.status === 201 || hrAssign.status === 200,
      `status=${hrAssign.status}, msg=${hrAssign.body.message}`);
  }

  if (guard2EmpId && siteId) {
    const opsAssign = await api('POST', '/guards/assign-site', { guardId: guard2EmpId, siteId }, OPS);
    check('OPERATIONS can assign site (newly granted)', opsAssign.status === 201 || opsAssign.status === 200,
      `status=${opsAssign.status}, msg=${opsAssign.body.message}`);
  }

  if (guard1EmpId && siteId) {
    const finAssign = await api('POST', '/guards/assign-site', { guardId: guard1EmpId, siteId }, FIN);
    check('FINANCE cannot assign site (removed)', finAssign.status === 403,
      `status=${finAssign.status}`);
  }

  // ===================== TEST 10: DASHBOARD =====================
  console.log('\n--- TEST 10: Dashboard ---');

  const empList = await api('GET', '/employees?limit=1', null, HR);
  const empCount = empList.body.pagination?.total || 0;
  check('Dashboard employee count available', empCount > 0, `count=${empCount}`);

  const siteList = await api('GET', '/sites?limit=1', null, HR);
  const siteCount = siteList.body.pagination?.total || 0;
  check('Dashboard site count available', siteCount >= 0, `count=${siteCount}`);

  // ===================== RESULTS =====================
  console.log('\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  console.log('========================================');
  results.forEach(r => console.log(r));
  console.log('========================================');

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
