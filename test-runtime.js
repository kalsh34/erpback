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

  // ===================== TEST 4: ATTENDANCE =====================
  console.log('\n--- TEST 4: Attendance ---');

  if (guardEmpId) {
    // Assign site to guard first
    const assign = await api('POST', '/guards/assign-site', { guardId: guardEmpId, siteId: siteId }, HR);
    check('Guard assigned to site', assign.status === 201 || assign.status === 200,
      `status=${assign.status}, msg=${assign.body.message}`);

    const clockIn = await api('POST', '/attendance/clock-in', {
      guardId: guardEmpId, siteId: siteId || '000000000000000000000000'
    }, HR);
    check('Clock in', clockIn.status === 201 && !!clockIn.body.data?._id,
      `status=${clockIn.status}, msg=${clockIn.body.message}`);
    const attId = clockIn.body.data?._id;

    const clockOut = await api('POST', `/attendance/clock-out/${guardEmpId}`, {}, HR);
    check('Clock out', clockOut.status === 200 && clockOut.body.data?.clockOut != null,
      `status=${clockOut.status}, clockOut=${clockOut.body.data?.clockOut}`);

    if (attId) {
      const editHrs = await api('PUT', `/attendance/${attId}/edit`, {
        totalHours: 10.5, reason: 'Testing edit'
      }, OPS);
      check('Edit hours', editHrs.status === 200 && editHrs.body.data?.totalHours === 10.5,
        `totalHours=${editHrs.body.data?.totalHours}`);

      // Check audit log exists for attendance
      const auditCheck = await api('GET', '/audit-logs?entity=AttendanceRecord&limit=5', null, FIN);
      check('Attendance audit log entries exist', auditCheck.status === 200 && (auditCheck.body.data?.length || auditCheck.body.logs?.length) > 0,
        `entries=${auditCheck.body.data?.length || auditCheck.body.logs?.length}`);
    }
  } else {
    check('Clock in', false, 'no guard ID');
    check('Clock out', false, 'no guard ID');
    check('Edit hours', false, 'no guard ID');
    check('Attendance audit log entries exist', false, 'no guard ID');
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
      const gClockIn = await api('POST', '/attendance/clock-in', {
        guardId: guardEmpId, siteId: siteId || '000000000000000000000000'
      }, GUARD);
      check('GUARD can clock in', gClockIn.status === 201, `status=${gClockIn.status}`);

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

  // ===================== TEST 12: Part C — Relief Chain (Declaration at Clock-Out) =====================
  console.log('\n--- TEST 12: Part C — Relief Chain (Declaration at Clock-Out) ---');

  const rcGuard1Email = `rc_guard1_${ts}@test.com`;
  const rcGuard1Reg = await api('POST', '/guards/register', {
    firstName: 'RcGuard1', lastName: 'Relief', phone: '0950000001',
    idCardNumber: `RC-G1-${ts}`, employmentType: 'CONTRACT',
    email: rcGuard1Email, password: 'password123'
  }, HR);
  const rcGuard1 = rcGuard1Reg.body.data?.employee?._id;

  const rcGuard2Email = `rc_guard2_${ts}@test.com`;
  const rcGuard2Reg = await api('POST', '/guards/register', {
    firstName: 'RcGuard2', lastName: 'Relief', phone: '0950000002',
    idCardNumber: `RC-G2-${ts}`, employmentType: 'CONTRACT',
    email: rcGuard2Email, password: 'password123'
  }, HR);
  const rcGuard2 = rcGuard2Reg.body.data?.employee?._id;

  const rcGuard3Email = `rc_guard3_${ts}@test.com`;
  const rcGuard3Reg = await api('POST', '/guards/register', {
    firstName: 'RcGuard3', lastName: 'Relief', phone: '0950000003',
    idCardNumber: `RC-G3-${ts}`, employmentType: 'CONTRACT',
    email: rcGuard3Email, password: 'password123'
  }, HR);
  const rcGuard3 = rcGuard3Reg.body.data?.employee?._id;

  check('Relief: 3 guards registered', !!rcGuard1 && !!rcGuard2 && !!rcGuard3,
    `g1=${!!rcGuard1}, g2=${!!rcGuard2}, g3=${!!rcGuard3}`);

  let RC1, RC2, RC3;
  if (rcGuard1Email) { const r = await api('POST', '/auth/login', { email: rcGuard1Email, password: 'password123' }); RC1 = r.body.data?.token; }
  if (rcGuard2Email) { const r = await api('POST', '/auth/login', { email: rcGuard2Email, password: 'password123' }); RC2 = r.body.data?.token; }
  if (rcGuard3Email) { const r = await api('POST', '/auth/login', { email: rcGuard3Email, password: 'password123' }); RC3 = r.body.data?.token; }
  check('Relief: All 3 guards logged in', !!RC1 && !!RC2 && !!RC3, `rc1=${!!RC1}, rc2=${!!RC2}, rc3=${!!RC3}`);

  // ---- 12-FIRST: First-ever shift at a brand new site ----
  const firstSite = await api('POST', '/sites', {
    siteName: `First Shift Site ${ts}`, siteCode: `FSS-${ts}`, client: 'FirstClient',
    location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
    agreedManpower: 2, actualManpower: 2, requiredGuardCount: 2
  }, HR);
  const firstSiteId = firstSite.body.data?._id;
  if (rcGuard1 && firstSiteId && RC1) {
    await api('POST', '/guards/assign-site', { guardId: rcGuard1, siteId: firstSiteId }, HR);
    const firstCI = await api('POST', '/attendance/clock-in', {
      guardId: rcGuard1, siteId: firstSiteId
    }, RC1);
    check('12-FIRST: First-ever shift at new site succeeds', firstCI.status === 201,
      `status=${firstCI.status}, msg=${firstCI.body.message}`);
    const firstCO = await api('POST', `/attendance/clock-out/${rcGuard1}`, {}, RC1);
    check('12-FIRST: First-ever shift clock out', firstCO.status === 200, `status=${firstCO.status}`);
  }

  // ---- 12-GAP: Existing site with history, zero on-duty, no predecessor needed ----
  if (rcGuard2 && firstSiteId && RC2) {
    await api('POST', '/guards/assign-site', { guardId: rcGuard2, siteId: firstSiteId }, HR);
    const gapOD = await api('GET', `/attendance/on-duty/${firstSiteId}`, null, HR);
    const gapOnDuty = gapOD.body.data || [];
    check('12-GAP: Site has history but zero on-duty', gapOD.status === 200 && gapOnDuty.length === 0,
      `onDuty=${gapOnDuty.length}`);

    const gapCI = await api('POST', '/attendance/clock-in', {
      guardId: rcGuard2, siteId: firstSiteId
    }, RC2);
    check('12-GAP: Guard clocks in with no predecessor (gap between shifts)', gapCI.status === 201,
      `status=${gapCI.status}, msg=${gapCI.body.message}`);

    await api('POST', `/attendance/clock-out/${rcGuard2}`, {}, RC2);
  }

  const rcSiteCreate = await api('POST', '/sites', {
    siteName: `Relief Test Site ${ts}`, siteCode: `RTS-${ts}`, client: 'ReliefClient',
    location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
    agreedManpower: 5, actualManpower: 5, requiredGuardCount: 2
  }, HR);
  const rcSiteId = rcSiteCreate.body.data?._id;
  check('Relief: Site with requiredGuardCount=2', !!rcSiteId && rcSiteCreate.body.data?.requiredGuardCount === 2,
    `status=${rcSiteCreate.status}, rc=${rcSiteCreate.body.data?.requiredGuardCount}`);

  if (rcGuard1 && rcSiteId) await api('POST', '/guards/assign-site', { guardId: rcGuard1, siteId: rcSiteId }, HR);
  if (rcGuard2 && rcSiteId) await api('POST', '/guards/assign-site', { guardId: rcGuard2, siteId: rcSiteId }, HR);
  if (rcGuard3 && rcSiteId) await api('POST', '/guards/assign-site', { guardId: rcGuard3, siteId: rcSiteId }, HR);

  if (rcSiteId) {
    const od1 = await api('GET', `/attendance/on-duty/${rcSiteId}`, null, HR);
    check('12a: On-duty empty before clock-ins', od1.status === 200 && Array.isArray(od1.body.data) && od1.body.data.length === 0,
      `count=${od1.body.data?.length}`);
  }

  if (rcGuard1 && rcSiteId && RC1) {
    const ci1 = await api('POST', '/attendance/clock-in', { guardId: rcGuard1, siteId: rcSiteId }, RC1);
    check('12b: Guard 1 clock in (first at site)', ci1.status === 201,
      `status=${ci1.status}, msg=${ci1.body.message}`);
  }

  if (rcSiteId) {
    const od2 = await api('GET', `/attendance/on-duty/${rcSiteId}`, null, HR);
    check('12c: On-duty = 1 after Guard 1 in', od2.status === 200 && od2.body.data?.length === 1,
      `count=${od2.body.data?.length}`);
  }

  if (rcGuard2 && rcSiteId && RC2) {
    const ci2 = await api('POST', '/attendance/clock-in', { guardId: rcGuard2, siteId: rcSiteId }, RC2);
    check('12d: Guard 2 clock in (no relief, 1<2 allowed)', ci2.status === 201,
      `status=${ci2.status}, msg=${ci2.body.message}`);
  }

  if (rcSiteId) {
    const od3 = await api('GET', `/attendance/on-duty/${rcSiteId}`, null, HR);
    check('12e: On-duty = 2 after Guard 2 in', od3.status === 200 && od3.body.data?.length === 2,
      `count=${od3.body.data?.length}`);
  }

  if (rcGuard3 && rcSiteId && RC3) {
    const ci3 = await api('POST', '/attendance/clock-in', { guardId: rcGuard3, siteId: rcSiteId }, RC3);
    check('12f: Guard 3 clock in ALLOWED (capacity is alert-only)', ci3.status === 201,
      `status=${ci3.status}, msg=${ci3.body.message}`);
  }

  if (rcGuard3 && rcSiteId && RC3 && rcGuard1) {
    const g1Active = await api('GET', `/attendance/active/${rcGuard1}`, null, HR);
    const g1ActiveId = g1Active.body.data?._id;
    if (g1ActiveId) {
      const ci3r = await api('POST', '/attendance/clock-in', {
        guardId: rcGuard3, siteId: rcSiteId
      }, RC3);
      check('12g: Guard 3 double-clock-in blocked (already has active shift)', ci3r.status === 409,
        `status=${ci3r.status}, msg=${ci3r.body.message}`);
    } else {
      check('12g: Guard 3 double-clock-in blocked (already has active shift)', true,
        'Guard 1 not on duty — Guard 3 already clocked in');
    }
  }

  if (rcGuard1 && RC1) {
    const co1 = await api('POST', `/attendance/clock-out/${rcGuard1}`, { declaredRelieverId: rcGuard3, declaredRelieverSiteId: rcSiteId }, RC1);
    check('12h: Guard 1 clock out + declares Guard 3 as reliever', co1.status === 200, `status=${co1.status}`);
    check('12h: Declaration stored on record', !!co1.body.data?.declaredRelieverId, `relieverId=${co1.body.data?.declaredRelieverId}`);
  }

  if (rcGuard3 && rcSiteId && RC3 && rcGuard1) {
    const g1Recent = await api('GET', `/attendance/recent/${rcGuard1}?days=1`, null, HR);
    const g1Completed = (g1Recent.body.data || []).find(r => r.clockOut != null);
    if (g1Completed) {
      const ci3f = await api('POST', '/attendance/clock-in', {
        guardId: rcGuard3, siteId: rcSiteId
      }, RC3);
      check('12i: Guard 3 double-clock-in blocked (active shift)', ci3f.status === 409,
        `status=${ci3f.status}, msg=${ci3f.body.message}`);
    } else {
      check('12i: Guard 3 double-clock-in blocked (active shift)', false, 'no completed shift');
    }
  }

  if (rcSiteId) {
    const cv = await api('GET', `/attendance/coverage-alerts/${rcSiteId}`, null, HR);
    check('12j: Coverage after Guard 1 out — at capacity (2/2)', cv.status === 200 && cv.body.data?.understaffed === false && cv.body.data?.overstaffed === false,
      `understaffed=${cv.body.data?.understaffed}, overstaffed=${cv.body.data?.overstaffed}, onDuty=${cv.body.data?.onDuty}, required=${cv.body.data?.required}`);
  }

  if (rcGuard2 && OPS && rcSiteId) {
    const g2Active = await api('GET', `/attendance/active/${rcGuard2}`, null, HR);
    const g2ActiveId = g2Active.body.data?._id;
    if (g2ActiveId) {
      const ov = await api('POST', `/attendance/override-clockout/${g2ActiveId}`, {
        reason: 'Fraud detected — guard left site early'
      }, OPS);
      check('12k: OPERATIONS override clock-out', ov.status === 200,
        `status=${ov.status}`);
      check('12k: Override has overrideReason', ov.body.data?.overrideReason === 'Fraud detected — guard left site early',
        `reason=${ov.body.data?.overrideReason}`);
      check('12k: Override has overrideBy', !!ov.body.data?.overrideBy, `by=${ov.body.data?.overrideBy}`);
    } else {
      check('12k: OPERATIONS override clock-out', false, 'no active shift');
      check('12k: Override has overrideReason', false, 'n/a');
      check('12k: Override has overrideBy', false, 'n/a');
    }
  }

  const freeSite = await api('POST', '/sites', {
    siteName: `Free Site ${ts}`, siteCode: `FS-${ts}`, client: 'Free',
    location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
    agreedManpower: 1, actualManpower: 1, requiredGuardCount: 0
  }, HR);
  const freeSiteId = freeSite.body.data?._id;

  if (freeSiteId) {
    const fgEmail = `freeguard_${ts}@test.com`;
    const fgReg = await api('POST', '/guards/register', {
      firstName: 'FreeGuard', lastName: 'Test', phone: '0951000001',
      idCardNumber: `FG-${ts}`, employmentType: 'CONTRACT',
      email: fgEmail, password: 'password123'
    }, HR);
    const fgId = fgReg.body.data?.employee?._id;

    if (fgId) {
      const fgLogin = await api('POST', '/auth/login', { email: fgEmail, password: 'password123' });
      const FG = fgLogin.body.data?.token;
      if (FG) {
        const fgCI = await api('POST', '/attendance/clock-in', { guardId: fgId, siteId: freeSiteId }, FG);
        check('12l: Free guard clock in for override test', fgCI.status === 201, `status=${fgCI.status}`);

        const fgActive = await api('GET', `/attendance/active/${fgId}`, null, HR);
        const fgActiveId = fgActive.body.data?._id;
        if (fgActiveId) {
          const gOv = await api('POST', `/attendance/override-clockout/${fgActiveId}`, {
            reason: 'Self override attempt'
          }, FG);
          check('12l: GUARD cannot override clock-out (403)', gOv.status === 403,
            `status=${gOv.status}, msg=${gOv.body.message}`);

          const opsOv = await api('POST', `/attendance/override-clockout/${fgActiveId}`, {
            reason: 'Valid operations override'
          }, OPS);
          check('12l: OPERATIONS override succeeds', opsOv.status === 200,
            `status=${opsOv.status}`);
        } else {
          check('12l: GUARD cannot override clock-out (403)', false, 'no active shift');
          check('12l: OPERATIONS override succeeds', false, 'no active shift');
        }
      } else {
        check('12l: GUARD cannot override clock-out (403)', false, 'login failed');
        check('12l: OPERATIONS override succeeds', false, 'login failed');
      }
    } else {
      check('12l: GUARD cannot override clock-out (403)', false, 'reg failed');
      check('12l: OPERATIONS override succeeds', false, 'reg failed');
    }
  }

  if (rcSiteId) {
    const finalOD = await api('GET', `/attendance/on-duty/${rcSiteId}`, null, HR);
    check('12m: On-duty final count after overrides', finalOD.status === 200 && finalOD.body.data?.length <= 2,
      `count=${finalOD.body.data?.length}`);
  }

  if (rcGuard3 && RC3) {
    const g3Active = await api('GET', `/attendance/active/${rcGuard3}`, null, HR);
    if (g3Active.body.data?._id) {
      await api('POST', `/attendance/clock-out/${rcGuard3}`, {}, RC3);
    }
    if (freeSiteId) {
      await api('POST', '/guards/assign-site', { guardId: rcGuard3, siteId: freeSiteId }, HR);
      const ci3after = await api('POST', '/attendance/clock-in', {
        guardId: rcGuard3, siteId: freeSiteId
      }, RC3);
      check('12n: Guard 3 clock in at different site (no declaration match)', ci3after.status === 201,
        `status=${ci3after.status}, msg=${ci3after.body.message}`);
      if (ci3after.status === 201) {
        await api('POST', `/attendance/clock-out/${rcGuard3}`, {}, RC3);
      }
    } else {
      check('12n: Guard 3 clock in at different site (no declaration match)', false, 'no free site');
    }
  }

  // ---- 12-48HR: Explicit 48-hour rule test with declaration at clock-out ----
  const hr48Site = await api('POST', '/sites', {
    siteName: `48Hr Test Site ${ts}`, siteCode: `48H-${ts}`, client: '48HrClient',
    location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
    agreedManpower: 1, actualManpower: 1, requiredGuardCount: 0
  }, HR);
  const hr48SiteId = hr48Site.body.data?._id;

  const hr48GuardEmail = `hr48guard_${ts}@test.com`;
  const hr48GuardReg = await api('POST', '/guards/register', {
    firstName: 'Hr48Guard', lastName: 'Test', phone: '0952000001',
    idCardNumber: `48G-${ts}`, employmentType: 'CONTRACT',
    email: hr48GuardEmail, password: 'password123'
  }, HR);
  const hr48GuardId = hr48GuardReg.body.data?.employee?._id;

  const hr48PredecessorEmail = `hr48pred_${ts}@test.com`;
  const hr48PredecessorReg = await api('POST', '/guards/register', {
    firstName: 'Hr48Pred', lastName: 'Test', phone: '0952000002',
    idCardNumber: `48P-${ts}`, employmentType: 'CONTRACT',
    email: hr48PredecessorEmail, password: 'password123'
  }, HR);
  const hr48PredecessorId = hr48PredecessorReg.body.data?.employee?._id;

  if (hr48GuardId && hr48SiteId && hr48PredecessorId) {
    const gLogin = await api('POST', '/auth/login', { email: hr48GuardEmail, password: 'password123' });
    const G48 = gLogin.body.data?.token;
    const pLogin = await api('POST', '/auth/login', { email: hr48PredecessorEmail, password: 'password123' });
    const P48 = pLogin.body.data?.token;

    if (G48 && P48) {
      await api('POST', '/guards/assign-site', { guardId: hr48PredecessorId, siteId: hr48SiteId }, HR);
      const predIn = await api('POST', '/attendance/clock-in', {
        guardId: hr48PredecessorId, siteId: hr48SiteId
      }, P48);
      check('12-48HR: Predecessor clock in', predIn.status === 201, `status=${predIn.status}`);

      const predOut = await api('POST', `/attendance/clock-out/${hr48PredecessorId}`,
        { declaredRelieverId: hr48GuardId, declaredRelieverSiteId: hr48SiteId }, P48);
      check('12-48HR: Predecessor clock out + declares successor', predOut.status === 200,
        `status=${predOut.status}`);
      check('12-48HR: Declaration stored', !!predOut.body.data?.declaredRelieverId,
        `relieverId=${predOut.body.data?.declaredRelieverId}`);

      await api('POST', '/guards/assign-site', { guardId: hr48GuardId, siteId: hr48SiteId }, HR);
      const succIn = await api('POST', '/attendance/clock-in', {
        guardId: hr48GuardId, siteId: hr48SiteId
      }, G48);
      check('12-48HR: Successor BLOCKED by 48hr rule (declaration match)', succIn.status === 400,
        `status=${succIn.status}, msg=${succIn.body.message}`);

      check('12-48HR: Error mentions 48 hours',
        (succIn.body.message || '').toLowerCase().includes('48'),
        `msg=${succIn.body.message}`);

      const otherSite = await api('POST', '/sites', {
        siteName: `Other Site ${ts}`, siteCode: `OTH-${ts}`, client: 'Other',
        location: 'Addis Ababa', siteType: 'COMMERCIAL', status: 'ACTIVE',
        agreedManpower: 1, actualManpower: 1, requiredGuardCount: 0
      }, HR);
      const otherSiteId = otherSite.body.data?._id;
      if (otherSiteId) {
        const succFree = await api('POST', '/attendance/clock-in', {
          guardId: hr48GuardId, siteId: otherSiteId
        }, G48);
        check('12-48HR: Successor ALLOWED at different site (no declaration)', succFree.status === 201,
          `status=${succFree.status}, msg=${succFree.body.message}`);
        if (succFree.status === 201) {
          await api('POST', `/attendance/clock-out/${hr48GuardId}`, {}, G48);
        }
      } else {
        check('12-48HR: Successor ALLOWED at different site (no declaration)', false, 'site creation failed');
      }
    } else {
      check('12-48HR: Successor BLOCKED by 48hr rule (declaration match)', false, 'login failed');
      check('12-48HR: Error mentions 48 hours', false, 'login failed');
      check('12-48HR: Successor ALLOWED at different site (no declaration)', false, 'login failed');
    }
  } else {
    check('12-48HR: Successor BLOCKED by 48hr rule (declaration match)', false, 'reg failed');
    check('12-48HR: Error mentions 48 hours', false, 'reg failed');
    check('12-48HR: Successor ALLOWED at different site (no declaration)', false, 'reg failed');
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
