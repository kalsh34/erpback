/**
 * Preview-only check: builds an in-memory workbook with a Full Name column plus
 * educational-level and fingerprint columns and asserts both survive
 * GuardImportService.previewSheet. No data is written to the database.
 */
import * as XLSX from 'xlsx';
import { connectDatabase } from '../src/config/database';
import { GuardImportService } from '../src/modules/hr/guards/guardImport.service';

async function main() {
  await connectDatabase();
  const rows = [
    ['Full Name', 'Gender', 'Age', 'Educational Level', 'Fingerprint', 'Phone'],
    ['Abe Kebede Tadesse', 'MALE',   27, 'Grade 12', '✓', '0911000001'],
    ['Sara Girma',         'FEMALE', 24, 'Diploma',  '✗', '0911000002'],
    ['Tom Bekele Ayele',   'MALE',   30, 'Degree',   '',  '0911000003'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Register');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const preview: any = await GuardImportService.previewSheet(buffer as Buffer);
  const list: any[] = preview.rows ?? [];
  if (!list.length) throw new Error('preview returned no rows: ' + JSON.stringify(preview).slice(0, 200));

  const [row1, row2, row3] = list;
  const failures: string[] = [];
  const assert = (label: string, ok: boolean) => { if (!ok) failures.push(label); };

  assert('row1 education',   row1.education   === 'Grade 12');
  assert('row1 fingerprint', row1.fingerprint === true);
  assert('row2 education',   row2.education   === 'Diploma');
  assert('row2 fingerprint', row2.fingerprint === false);
  assert('row3 fingerprint blank stays unset', row3.fingerprint === undefined);

  if (failures.length) {
    console.error('FAILURES:', failures.join(', '));
    console.error('rows:', JSON.stringify(list, null, 2).slice(0, 2000));
    process.exit(1);
  }
  console.log(`PASS: ${list.length} preview rows mapped`);
  console.log(`row1 -> education=${JSON.stringify(row1.education)} fingerprint=${row1.fingerprint}`);
  console.log(`row2 -> education=${JSON.stringify(row2.education)} fingerprint=${row2.fingerprint}`);
  console.log(`row3 -> fingerprint=${row3.fingerprint}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
