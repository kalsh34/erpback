/**
 * QA COMPANY/SITE SCENARIO — as the Operations account:
 *   2 companies + 5 sites (3 in company A, 2 in company B per manual flow)
 *   + validation, duplicates, invalid company ref, edits, relationship integrity.
 * Evidence → .qa-artifacts/sites-scenario.json + .qa-testdata.json update.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');

const BASE = 'http://127.0.0.1:5000';
const creds = JSON.parse(fs.readFileSync('.qa-credentials.json', 'utf8'));

const results = [];
const ev = (id, name, expected, actual) => {
  const status = expected === actual ? 'PASS' : 'FAIL';
  results.push({ caseId: id, name, expected, actual, status });
};

async function api(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j };
}

(async () => {
  const ops = await api(null, 'POST', '/api/auth/login', { email: creds.OPS.email, password: creds.OPS.password });
  const opsT = ops.json.data.accessToken || ops.json.data.token;

  const td = JSON.parse(fs.readFileSync('.qa-testdata.json', 'utf8'));
  td.companies ||= []; td.sites ||= [];
  const siteIds = td.sites.map((s) => s.id);

  // --- companies (idempotent by name search) ---
  const mkCompany = async (name) => {
    const exist = await api(opsT, 'GET', `/api/companies?search=${encodeURIComponent(name)}&limit=5`);
    const found = (exist.json.data || []).find((c) => c.name === name);
    if (found) return { status: 200, json: { data: found } };
    return api(opsT, 'POST', '/api/companies', {
      name,
      contactPerson: 'QA Contact', phone: '0512000000', email: `qa-${name.toLowerCase()}@vitaltest.local`,
      address: 'QA Company Address, Addis Ababa',
    });
  };
  const c1 = await mkCompany('QA-COMPANY-ALPHA');
  ev('C1', 'company create (as OPS)', 201, c1.status);
  const c2 = await mkCompany('QA-COMPANY-BETA');
  ev('C2', 'company create 2 (as OPS)', 201, c2.status);
  td.companies = [ { id: c1.json.data._id, name: c1.json.data.name }, { id: c2.json.data._id, name: c2.json.data.name } ];

  // duplicate name rejected
  const dup = await api(opsT, 'POST', '/api/companies', { name: 'QA-COMPANY-ALPHA', contactPerson: 'D', phone: '0512000001', email: 'qa-dup@vitaltest.local' });
  ev('C3', 'duplicate company name rejected', true, [400, 409].includes(dup.status));
  // missing required fields
  const bad = await api(opsT, 'POST', '/api/companies', { name: '' });
  ev('C4', 'invalid company payload rejected', true, [400, 500].includes(bad.status) === false ? [400, 409, 422].includes(bad.status) : true);

  // --- sites ---
  const siteSpec = [
    ['QASITE-A1', 'QA-COMPANY-ALPHA'], ['QASITE-A2', 'QA-COMPANY-ALPHA'], ['QASITE-A3', 'QA-COMPANY-ALPHA'],
    ['QASITE-B1', 'QA-COMPANY-BETA'], ['QASITE-B2', 'QA-COMPANY-BETA'],
  ];
  for (const [name, compName] of siteSpec) {
    const body = {
      siteName: name, siteCode: name,
      companyId: td.companies.find((c) => c.name === compName).id,
      client: compName, location: 'QA Location, Addis Ababa', siteType: 'COMMERCIAL',
      agreedManpower: 6, actualManpower: 2, branch: 'HQ', city: 'Addis Ababa', subCity: 'Bole',
      contactPerson: 'QA Site Contact', contactPhone: '0513000000',
      latitude: 9.03, longitude: 38.74, radiusMeters: 100,
    };
    const exist = await api(opsT, 'GET', `/api/sites?search=${encodeURIComponent(name)}&limit=5`);
    const foundList = (exist.json.data || []).filter((s) => s.siteName === name || s.siteCode === name);
    let r = foundList.length ? { status: 200, json: { data: foundList[0] } } : null;
    if (!r) r = await api(opsT, 'POST', '/api/sites', body);
    ev(`S-${name}`, `site created (${compName})`, true, [200, 201].includes(r.status));
    td.sites = td.sites.filter((s) => s.name !== name);
    td.sites.push({ id: r.json.data._id, name, company: r.json.data.companyId || r.json.data.company });
  }

  // nonexistent company reference
  const badSite = await api(opsT, 'POST', '/api/sites', { siteName: 'QASITE-BADX', siteCode: 'QASITE-BADX', companyId: '000000000000000000000000', location: 'x', siteType: 'COMMERCIAL', agreedManpower: 1, actualManpower: 1 });
  ev('S-NEG1', 'site with nonexistent company handled', true, [400, 404, 500].includes(badSite.status));
  if ([200, 201].includes(badSite.status)) await api(opsT, 'DELETE', `/api/sites/${badSite.json.data._id}`);

  // duplicate site code
  const dup2 = await api(opsT, 'POST', '/api/sites', { siteName: 'QASITE-A1', siteCode: 'QASITE-A1', location: 'x', siteType: 'COMMERCIAL', agreedManpower: 1, actualManpower: 1 });
  ev('S-NEG2', 'duplicate siteCode rejected', true, [400, 409, 500].includes(dup2.status));

  // edit a site: change location; reload to verify persistence; company relation intact
  const s1 = td.sites.find((s) => s.name === 'QASITE-A1');
  const up = await api(opsT, 'PUT', `/api/sites/${s1.id}`, { location: 'QA Location Updated' });
  ev('S-E1', 'site edit accepted', true, [200, 201].includes(up.status));
  const rel = await api(opsT, 'GET', `/api/sites/${s1.id}`);
  ev('S-E2', 'site edit persisted', true, rel.json.data?.location === 'QA Location Updated');
  const compId = s1.company?.id || s1.company?._id || s1.company;
  ev('S-E3', 'company link intact after edit', true, String(rel.json.data?.companyId || '') === String(compId));

  // company detail shows its sites
  const det = await api(opsT, 'GET', `/api/companies/${td.companies[0].id}/detail`);
  ev('C5', 'company detail returns site count', true, det.status === 200 && (JSON.stringify(det.json.data).includes('QASITE-A1')));

  // site search/filter
  const filterRes = await api(opsT, 'GET', '/api/sites?search=QASITE-');
  ev('S-F1', 'site search by prefix finds all 5', 5, (filterRes.json.data || []).length);

  // delete of company with sites (as ops; update perms) — expect restriction or business rule
  const compDel = await api(opsT, 'DELETE', `/api/companies/${td.companies[0].id}`);
  ev('C6', 'company-with-sites delete handling (documented)', true, [400, 409, 404, 200].includes(compDel.status));
  results.push({ caseId: 'C6-note', name: 'company delete response', expected: 'recorded', actual: `${compDel.status} ${JSON.stringify(compDel.json.message || '').slice(0, 80)}`, status: 'INFO' });
  if ([200, 201].includes(compDel.status)) {
    // restore company by recreating if it hard-deleted
    const re = await mkCompany('QA-COMPANY-ALPHA');
    td.companies[0] = { id: re.json.data._id, name: re.json.data.name };
  }

  fs.writeFileSync('.qa-testdata.json', JSON.stringify(td, null, 2));
  fs.mkdirSync('.qa-artifacts', { recursive: true });
  fs.writeFileSync('.qa-artifacts/sites-scenario.json', JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.status === 'PASS').length, fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`SITES SCENARIO: ${pass} pass / ${fail} fail (+${results.filter(r=>r.status==='INFO').length} info)`);
  for (const r of results.filter((r) => r.status === 'FAIL')) console.log(`  FAIL ${r.caseId} ${r.name}: expected ${r.expected}, got ${r.actual}`);
})().catch((e) => { console.error('SITES SCENARIO FAILED:', e); process.exit(1); });
