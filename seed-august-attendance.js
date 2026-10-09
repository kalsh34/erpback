const http = require('http');

function req(method, path, body, authToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://127.0.0.1:5000');
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const r = http.request({ hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function loginAs(email) {
  const res = await req('POST', '/api/auth/login', { email, password: 'password123' });
  const t = res.token || res.data?.token;
  if (!t) throw new Error('Login failed for ' + email + ': ' + JSON.stringify(res));
  return t;
}

function isWeekend(year, month, day) {
  return new Date(year, month - 1, day).getDay() % 6 === 0;
}

function randomHours() {
  const r = Math.random();
  if (r < 0.1) return 6;
  if (r < 0.3) return 8;
  if (r < 0.6) return 10;
  if (r < 0.85) return 12;
  return 14;
}

async function main() {
  // Login as HR_ADMIN for staff attendance (has STAFF_ATTENDANCE_MANAGE)
  const hrToken = await loginAs('hr@vitalpayroll.com');
  console.log('[LOGIN] HR_ADMIN OK');

  // Login as OPERATIONS for guard attendance (has ATTENDANCE_FILE)
  const opsToken = await loginAs('ops@vitalpayroll.com');
  console.log('[LOGIN] OPERATIONS OK');

  // Get all employees
  const empRes = await req('GET', '/api/employees?limit=200', null, hrToken);
  const allEmps = empRes.data || [];
  const staff = allEmps.filter(e => e.category === 'OFFICE_STAFF');
  console.log(`[INFO] ${staff.length} office staff found`);

  // Get all guards
  const guardRes = await req('GET', '/api/guards', null, opsToken);
  const allGuards = guardRes.data || [];
  const assigned = allGuards.filter(g => g.currentAssignments?.length > 0);
  console.log(`[INFO] ${allGuards.length} guards total, ${assigned.length} with assignments`);

  // === STAFF ATTENDANCE ===
  console.log(`\n[STAFF] Filling August for ${staff.length} employees...`);
  let staffCreated = 0, staffSkipped = 0;
  for (const emp of staff) {
    for (let day = 1; day <= 31; day++) {
      const weekend = isWeekend(2026, 8, day);
      const status = weekend ? 'WEEKEND' : (Math.random() < 0.82 ? 'PRESENT' : 'ABSENT');
      try {
        const res = await req('POST', '/api/staff-attendance/day', {
          employeeId: emp._id, year: 2026, month: 8, dayOfMonth: day, status
        }, hrToken);
        if (res.success) staffCreated++;
        else { staffSkipped++; if (staffSkipped <= 3) console.log(`  [SKIP] ${emp.firstName} day ${day}: ${res.message}`); }
      } catch (e) { staffSkipped++; }
    }
    process.stdout.write(`  ${emp.firstName} done (${staffCreated} created, ${staffSkipped} skipped)\r`);
  }
  console.log(`\n[STAFF] Total: ${staffCreated} created, ${staffSkipped} skipped`);

  // === GUARD ATTENDANCE ===
  console.log(`\n[GUARDS] Filling August for ${assigned.length} guards...`);
  let guardCreated = 0, guardSkipped = 0;
  for (const g of assigned) {
    const emp = g.employee;
    const siteId = typeof g.currentAssignments[0].siteId === 'object' ? g.currentAssignments[0].siteId._id : g.currentAssignments[0].siteId;
    for (let day = 1; day <= 31; day++) {
      if (isWeekend(2026, 8, day)) continue;
      const hours = randomHours();
      try {
        const res = await req('POST', '/api/attendance/manual-entry', {
          guardId: emp._id, siteId,
          date: `2026-08-${String(day).padStart(2, '0')}`,
          hoursWorked: hours, isHoliday: false, notes: 'Seeded attendance',
        }, opsToken);
        if (res.success) guardCreated++;
        else { guardSkipped++; if (guardSkipped <= 3) console.log(`  [SKIP] ${emp.firstName} day ${day}: ${res.message}`); }
      } catch (e) { guardSkipped++; }
    }
    process.stdout.write(`  ${emp.firstName} done (${guardCreated} created, ${guardSkipped} skipped)\r`);
  }
  console.log(`\n[GUARDS] Total: ${guardCreated} created, ${guardSkipped} skipped`);

  // === VERIFY ===
  console.log('\n[VERIFY] Checking data...');
  const attCheck = await req('GET', '/api/attendance?startDate=2026-08-01&endDate=2026-08-31', null, opsToken);
  const records = attCheck.data || [];
  console.log(`  Attendance records in August: ${records.length}`);
  const manualEntries = records.filter(r => r.source === 'MANUAL_ENTRY');
  console.log(`  Manual entries: ${manualEntries.length}`);

  const gridCheck = await req('GET', '/api/staff-attendance/grid?year=2026&month=8', null, hrToken);
  const gridRows = (gridCheck.data?.grid || []);
  console.log(`  Staff grid rows: ${gridRows.length}`);
  if (gridRows.length > 0) {
    const first = gridRows[0];
    const statuses = first.days.map(d => d.status ? d.status[0] : '_').join('');
    console.log(`  First staff (${first.employee.firstName}): ${statuses}`);
  }

  console.log('\n[DONE]');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
