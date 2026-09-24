/**
 * E2E API test for the guard rotation lifecycle.
 * Requires backend running on :5000 and MongoDB on :27017.
 * Run: node e2e-rotation.js
 */
/* eslint-disable no-console */
const BASE = process.env.API_URL || 'http://127.0.0.1:5000/api';

let passed = 0;
let failed = 0;

function ok(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* ignore */ }
  return { status: res.status, json };
}

async function login(email, password) {
  const r = await req('POST', '/auth/login', { body: { email, password } });
  if (r.status !== 200 || !r.json?.data?.token) {
    throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.json)}`);
  }
  return r.json.data.token;
}

async function main() {
  console.log('E2E rotation lifecycle against', BASE);

  const admin = await login('admin@vitalpayroll.com', 'password123');
  ok('login as admin', !!admin);

  const ops = await login('ops@vitalpayroll.com', 'password123').catch(() => null);
  ok('login as ops', !!ops);

  // Sites + guards
  const sitesRes = await req('GET', '/sites', { token: admin });
  const sites = sitesRes.json?.data || [];
  ok('list sites', sites.length > 0, `count=${sites.length}`);
  const siteId = sites[0]._id;

  const guardsRes = await req('GET', '/guards', { token: admin });
  const guardRows = guardsRes.json?.data || [];
  const guardIds = guardRows
    .map((g) => g.employee?._id || g._id)
    .filter(Boolean)
    .slice(0, 6);
  ok('list guards (need >= 4)', guardIds.length >= 4, `got ${guardIds.length}`);

  // Fairness util requires ROTATION_READ
  const fair = await req('GET', '/rotations/utils/fairness?poolSize=6&slotCount=3', { token: admin });
  ok('fairness util authorized', fair.status === 200 && fair.json?.data?.isFair === true, `status=${fair.status}`);
  const fairNoAuth = await req('GET', '/rotations/utils/fairness?poolSize=6&slotCount=3');
  ok('fairness util rejects anonymous', fairNoAuth.status === 401 || fairNoAuth.status === 403, `status=${fairNoAuth.status}`);

  // Create rotation with explicit shift definitions (min-0 allowed)
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const startDate = start.toISOString().slice(0, 10);
  const end = new Date(start.getTime() + 13 * 86400000).toISOString().slice(0, 10);

  const createRes = await req('POST', '/rotations', {
    token: admin,
    body: {
      name: `E2E Embassy ${Date.now()}`,
      description: 'E2E lifecycle test',
      siteId,
      shiftMode: 'STANDARD_12H',
      shiftDefinitions: [
        { key: 'DAY', name: 'Day Shift', startTime: '06:00', endTime: '18:00', requiredCount: 1 },
        { key: 'NIGHT', name: 'Night Shift', startTime: '18:00', endTime: '06:00', requiredCount: 2 },
      ],
      dayShiftCount: 1,
      nightShiftCount: 2,
      dayStartTime: '06:00',
      dayEndTime: '18:00',
      nightStartTime: '18:00',
      nightEndTime: '06:00',
      startDate,
      endDate: end,
      restRules: [
        { maxShiftHours: 12, minRestHours: 24 },
        { maxShiftHours: 24, minRestHours: 48 },
      ],
    },
  });
  ok('create rotation', createRes.status === 201, `status=${createRes.status} ${JSON.stringify(createRes.json)?.slice(0, 200)}`);
  const rotId = createRes.json?.data?._id;
  ok('rotation id present', !!rotId);

  // Zero-requirement rejected
  const badCreate = await req('POST', '/rotations', {
    token: admin,
    body: {
      name: 'Zero req',
      siteId,
      dayShiftCount: 0,
      nightShiftCount: 0,
      startDate,
    },
  });
  ok('rejects zero daily requirement', badCreate.status === 400, `status=${badCreate.status}`);

  // Add guards
  const addRes = await req('POST', `/rotations/${rotId}/guards`, {
    token: admin,
    body: { guardIds },
  });
  ok('add guards to pool', addRes.status === 200, `status=${addRes.status}`);

  // Preview
  const prev = await req('GET', `/rotations/${rotId}/preview?days=14`, { token: admin });
  ok('preview 200', prev.status === 200, `status=${prev.status}`);
  const prevData = prev.json?.data;
  ok('preview has cells', Array.isArray(prevData?.cells) && prevData.cells.length > 0, `cells=${prevData?.cells?.length}`);
  ok('preview feasibility', prevData?.feasibility === 'FULLY_COMPLIANT' || prevData?.feasibility === 'BEST_POSSIBLE', prevData?.feasibility);
  ok('preview keeps legacy keys', Array.isArray(prevData?.assignments) && prevData?.guardStats, 'legacy shape');
  if (prevData?.cells?.length) {
    // coverage 1D+2N = 3/day
    const byDay = {};
    for (const c of prevData.cells) byDay[c.dayIndex] = (byDay[c.dayIndex] || 0) + 1;
    const dayCounts = Object.values(byDay);
    ok('preview coverage 3/day', dayCounts.every((n) => n === 3), `counts=${JSON.stringify(dayCounts.slice(0, 5))}`);
  }

  // Generate
  const gen = await req('POST', `/rotations/${rotId}/generate`, {
    token: admin,
    body: { days: 14 },
  });
  ok('generate 200', gen.status === 200, `status=${gen.status} ${JSON.stringify(gen.json)?.slice(0, 200)}`);
  ok('generate count > 0', (gen.json?.data?.count || 0) > 0, `count=${gen.json?.data?.count}`);
  ok('status -> REVIEW', gen.json?.data?.status === 'REVIEW', gen.json?.data?.status);

  const detail = await req('GET', `/rotations/${rotId}`, { token: admin });
  ok('detail has generation meta', !!detail.json?.data?.generation, '');
  ok('generation not stale', detail.json?.data?.generation?.stale === false, String(detail.json?.data?.generation?.stale));
  ok('algorithm version recorded', !!detail.json?.data?.generation?.algorithmVersion, detail.json?.data?.generation?.algorithmVersion);

  // Assignments
  const assigns = await req('GET', `/rotations/${rotId}/assignments`, { token: admin });
  ok('assignments listed', assigns.status === 200 && (assigns.json?.data?.length || 0) > 0, `n=${assigns.json?.data?.length}`);

  // Validate stored
  const val = await req('POST', `/rotations/${rotId}/validate`, { token: admin, body: {} });
  ok('validate 200', val.status === 200, `status=${val.status}`);
  ok('validate checked cells', (val.json?.data?.checked || 0) > 0, `checked=${val.json?.data?.checked}`);

  // Stats + conflicts
  const stats = await req('GET', `/rotations/${rotId}/stats`, { token: admin });
  ok('stats 200', stats.status === 200 && stats.json?.data?.coverage, `status=${stats.status}`);
  const conf = await req('GET', `/rotations/${rotId}/conflicts`, { token: admin });
  ok('conflicts 200', conf.status === 200, `status=${conf.status}`);

  // HEAD cannot generate (no ROTATION_GENERATE) but can read
  const head = await login('head@vitalpayroll.com', 'password123');
  const headPrev = await req('GET', `/rotations/${rotId}/preview?days=7`, { token: head });
  ok('HEAD can preview', headPrev.status === 200, `status=${headPrev.status}`);
  const headGen = await req('POST', `/rotations/${rotId}/generate`, { token: head, body: { days: 7 } });
  ok('HEAD cannot generate', headGen.status === 403, `status=${headGen.status}`);

  // Ops can generate, approve is HR/SUPER only — ops lacks ROTATION_APPROVE? ops has OVERRIDE but not APPROVE
  const opsGen = await req('POST', `/rotations/${rotId}/generate`, { token: ops, body: { days: 14 } });
  ok('OPS can generate', opsGen.status === 200, `status=${opsGen.status}`);
  const opsApprove = await req('POST', `/rotations/${rotId}/approve`, { token: ops });
  ok('OPS cannot approve', opsApprove.status === 403, `status=${opsApprove.status}`);

  // Approve as admin
  const appr = await req('POST', `/rotations/${rotId}/approve`, { token: admin });
  ok('approve REVIEW -> APPROVED', appr.status === 200 && appr.json?.data?.status === 'APPROVED', `${appr.status} ${appr.json?.data?.status}`);

  // Move: pick two guards from day 0
  const day0 = new Date(startDate);
  const a0 = assigns.json?.data?.filter((a) => new Date(a.date).toDateString() === day0.toDateString()) || [];
  if (a0.length >= 2) {
    const from = a0[0].guardId?._id || a0[0].guardId;
    const to = a0[1].guardId?._id || a0[1].guardId;
    const move = await req('POST', `/rotations/${rotId}/move`, {
      token: admin,
      body: { date: startDate, fromGuardId: String(from), toGuardId: String(to), shiftKey: a0[0].shiftType },
    });
    // may 200 (swap) or 409 (violations with body)
    ok('move returns 200 or 409 with violations', move.status === 200 || (move.status === 409 && Array.isArray(move.json?.violations)), `status=${move.status}`);
  } else {
    ok('move skip (need 2 day-0 assigns)', false, `n=${a0.length}`);
  }

  // Rotate day
  const rotDay = await req('POST', `/rotations/${rotId}/rotate`, {
    token: admin,
    body: { date: startDate, steps: 1 },
  });
  ok('rotate day 200 or 409', rotDay.status === 200 || rotDay.status === 409, `status=${rotDay.status}`);

  // Publish as admin
  const pub = await req('POST', `/rotations/${rotId}/publish`, { token: admin });
  ok('publish APPROVED -> PUBLISHED/ACTIVE', pub.status === 200 && ['PUBLISHED', 'ACTIVE'].includes(pub.json?.data?.status), `${pub.status} ${pub.json?.data?.status}`);

  // Shift assignments created with source ROTATION
  const sa = await req('GET', `/shifts/assignments?siteId=${siteId}`, { token: admin });
  ok('shift assignments readable', sa.status === 200, `status=${sa.status}`);

  // Ops cannot publish
  // (already published — create second rotation for permission check)
  const create2 = await req('POST', '/rotations', {
    token: admin,
    body: {
      name: `E2E Perm ${Date.now()}`,
      siteId,
      shiftDefinitions: [{ key: 'DAY', name: 'Day', startTime: '06:00', endTime: '18:00', requiredCount: 1 }],
      dayShiftCount: 1,
      nightShiftCount: 0,
      startDate,
    },
  });
  const rot2 = create2.json?.data?._id;
  await req('POST', `/rotations/${rot2}/guards`, { token: admin, body: { guardIds: guardIds.slice(0, 3) } });
  await req('POST', `/rotations/${rot2}/generate`, { token: admin, body: { days: 7 } });
  await req('POST', `/rotations/${rot2}/approve`, { token: admin });
  const opsPub = await req('POST', `/rotations/${rot2}/publish`, { token: ops });
  ok('OPS cannot publish', opsPub.status === 403, `status=${opsPub.status}`);
  const adminPub2 = await req('POST', `/rotations/${rot2}/publish`, { token: admin });
  ok('admin publishes second', adminPub2.status === 200, `status=${adminPub2.status}`);

  // Delete cleanup
  const del1 = await req('DELETE', `/rotations/${rotId}`, { token: admin });
  ok('delete first rotation', del1.status === 200, `status=${del1.status}`);
  const del2 = await req('DELETE', `/rotations/${rot2}`, { token: admin });
  ok('delete second rotation', del2.status === 200, `status=${del2.status}`);

  console.log('');
  console.log(`E2E Result: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('E2E fatal:', e);
  process.exit(1);
});
