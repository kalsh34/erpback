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

async function main() {
  const login = await req('POST', '/api/auth/login', { email: 'admin@vitalpayroll.com', password: 'password123' });
  const token = login.token || login.data?.token;
  console.log('[LOGIN]', token ? 'OK' : 'FAILED');

  // Check raw attendance records count
  const attRes = await req('GET', '/api/attendance?startDate=2026-08-01&endDate=2026-08-31', null, token);
  const allRecords = attRes.data || [];
  console.log(`\n[ATTENDANCE] Total records in August: ${allRecords.length}`);
  
  // Count by source
  const bySource = {};
  allRecords.forEach(r => { bySource[r.source] = (bySource[r.source] || 0) + 1; });
  console.log('By source:', bySource);

  // Count by guard
  const byGuard = {};
  allRecords.forEach(r => {
    const gid = r.guardId?._id || r.guardId;
    byGuard[gid] = (byGuard[gid] || 0) + 1;
  });
  const guardIds = Object.keys(byGuard);
  console.log(`Guards with records: ${guardIds.length}`);
  // Show top 5
  guardIds.sort((a, b) => byGuard[b] - byGuard[a]);
  for (const gid of guardIds.slice(0, 5)) {
    console.log(`  ${gid}: ${byGuard[gid]} records`);
  }

  // Check staff attendance - try the raw endpoint
  console.log('\n[STAFF ATTENDANCE] Testing day endpoint...');
  const empRes = await req('GET', '/api/employees?limit=3&category=OFFICE_STAFF', null, token);
  const staff = empRes.data || [];
  if (staff.length > 0) {
    const emp = staff[0];
    console.log(`  Testing ${emp.firstName} ${emp.lastName}...`);
    // Try to save a day directly
    const saveRes = await req('POST', '/api/staff-attendance/day', {
      employeeId: emp._id, year: 2026, month: 8, dayOfMonth: 15, status: 'PRESENT'
    }, token);
    console.log('  Save result:', JSON.stringify(saveRes).substring(0, 200));

    // Now try to get the grid
    const gridRes = await req('GET', '/api/staff-attendance/grid?year=2026&month=8', null, token);
    console.log('  Grid response:', JSON.stringify(gridRes).substring(0, 300));
  }

  // Check guard manual entry directly
  console.log('\n[GUARD MANUAL ENTRY] Testing...');
  const guardRes = await req('GET', '/api/guards', null, token);
  const guards = guardRes.data || [];
  const assigned = guards.filter(g => g.currentAssignments?.length > 0 && g.employee.firstName !== 'Test' && g.employee.firstName !== 'FreeGuard');
  if (assigned.length > 0) {
    const g = assigned[0];
    const siteId = typeof g.currentAssignments[0].siteId === 'object' ? g.currentAssignments[0].siteId._id : g.currentAssignments[0].siteId;
    console.log(`  Trying: ${g.employee.firstName} ${g.employee.lastName} at site ${siteId}`);
    
    // Try to file one record
    const fileRes = await req('POST', '/api/attendance/manual-entry', {
      guardId: g.employee._id, siteId, date: '2026-08-15', hoursWorked: 10, isHoliday: false, notes: 'Test'
    }, token);
    console.log('  File result:', JSON.stringify(fileRes).substring(0, 300));
    
    // Verify it shows up
    const checkRes = await req('GET', `/api/attendance?startDate=2026-08-15&endDate=2026-08-15`, null, token);
    const checkRecords = (checkRes.data || []).filter(r => (r.guardId?._id || r.guardId) === g.employee._id);
    console.log(`  Records for ${g.employee.firstName} on Aug 15: ${checkRecords.length}`);
  }

  console.log('\n[DONE]');
  process.exit(0);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
