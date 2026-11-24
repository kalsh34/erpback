/**
 * Builds a guard-roster .xlsx from the attached spreadsheet export and pushes it
 * through the real guard import endpoints (preview + execute).
 *
 * Usage: node scripts-guard-import-sample.cjs [--execute]
 * Evidence: .qa-artifacts/guards-sample.xlsx + .qa-artifacts/guard-import.json
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, '.cloud-attachments', '0e8056ec98c735d5cbe6cd5ce27250a50b47b12064bf7d6e8dbcf5cd21086d5d.txt');
const OUT_DIR = path.join(ROOT, '.qa-artifacts');
const PUBLIC_XLSX = path.join(ROOT, 'erpfront', 'public', 'qa-guards-sample.xlsx');
const API = process.env.QA_BASE || 'http://127.0.0.1:5000';
const LOGIN = { email: 'admin@vitalpayroll.com', password: 'password123' };

function parseMarkdownTable(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (/^\|\s*-+/.test(trimmed)) continue; // separator row
    const cells = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    rows.push(cells);
  }
  return rows;
}

(async () => {
  const text = fs.readFileSync(SOURCE, 'utf8');
  const table = parseMarkdownTable(text);

  // The export carries the roster layout: a banner row, a spacer, a partial
  // "የመኖሪያ አድራሻ" grouping row, then the real header row.
  const headerIdx = table.findIndex((cells) => cells.includes('ሙሉ ስም'));
  if (headerIdx < 0) throw new Error('Could not find the header row (ሙሉ ስም) in the export');
  const headers = table[headerIdx];
  const dataRows = table
    .slice(headerIdx + 1)
    .filter((cells) => /^\d+$/.test(cells[0] || ''));

  const aoa = [
    ['የጥበቃ ሠራተኞች የቅጥር መዝገብ'],
    [],
    ['', '', '', '', '', 'የመኖሪያ አድራሻ', 'የመኖሪያ አድራሻ', 'የመኖሪያ አድራሻ'],
    headers,
    ...dataRows.map((cells) => {
      const out = [...cells];
      // Keep numeric columns numeric so the importer gets numbers, not strings.
      for (const i of [0, 3, 13, 14, 15]) {
        const n = Number(out[i]);
        if (out[i] !== '' && !Number.isNaN(n)) out[i] = n;
      }
      return out;
    }),
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, path.join(OUT_DIR, 'guards-sample.xlsx'));
  fs.mkdirSync(path.dirname(PUBLIC_XLSX), { recursive: true });
  fs.copyFileSync(path.join(OUT_DIR, 'guards-sample.xlsx'), PUBLIC_XLSX);

  console.log(`Built ${dataRows.length} guard rows -> .qa-artifacts/guards-sample.xlsx`);

  // ---- preview through the real endpoint ----
  const login = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN),
  });
  const auth = await login.json();
  const token = auth.data && (auth.data.accessToken || auth.data.token);
  if (!token) throw new Error('Login failed: ' + JSON.stringify(auth).slice(0, 200));

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(path.join(OUT_DIR, 'guards-sample.xlsx'))], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), 'guards-sample.xlsx');

  const previewRes = await fetch(`${API}/api/guards/import/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const preview = await previewRes.json();
  if (!preview.success) {
    console.error('Preview failed', previewRes.status, JSON.stringify(preview).slice(0, 400));
    process.exit(1);
  }

  const data = preview.data;
  const s = data.summary || {};
  console.log(`PREVIEW: total ${s.totalRows}, ready ${s.readyCount}, duplicate ${s.duplicateCount}, invalid ${s.invalidCount}, new sites ${s.newSitesCount}`);
  console.log('First rows:');
  for (const r of (data.rows || []).slice(0, 3)) {
    console.log(`  [${r.status}] ${r.fullNameRaw} | ${r.gender} | ${r.phone} | ${r.siteName} | ${r.salary} | ${r.position}`);
  }
  console.log(`Distinct sites: ${[...new Set((data.rows || []).map((r) => r.siteName))].length}`);

  let result = null;
  const ready = (data.rows || []).filter((r) => r.status === 'READY');
  if (process.argv.includes('--execute') && ready.length) {
    const execRes = await fetch(`${API}/api/guards/import/execute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: ready }),
    });
    result = await execRes.json();
    console.log('EXECUTE:', JSON.stringify(result.data || result).slice(0, 300));
  }

  fs.writeFileSync(path.join(OUT_DIR, 'guard-import.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    sourceRows: dataRows.length,
    summary: data.summary,
    sample: (data.rows || []).slice(0, 5),
    executed: result && (result.data || result),
  }, null, 2));
})();
