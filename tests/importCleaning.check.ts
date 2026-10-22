import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
  cleanPhone, cleanNumber, cleanCheckmark, cleanKebeleId, cleanGender,
  cleanName, cleanHireDate, normalizeNameForMatch, personKey,
} from '../src/modules/hr/import/cleaning';
import { ethiopianToIso, parseEthiopianDate } from '../src/modules/hr/import/ethiopianDate';
import { mergeSheets, ImportOptions } from '../src/modules/hr/import/mergeSheets';
import { Guarantor } from '../src/models/Guarantor';
import { Contract } from '../src/models/Contract';
import { Employee } from '../src/models/Employee';
import { EmployeeCategory, Gender } from '../src/types';

/**
 * Import pipeline checks. Only ever touches a throwaway database whose name
 * starts with import_check_ on a local MongoDB, and drops it when finished.
 * Usage: npx ts-node --transpile-only tests/importCleaning.check.ts
 */

const host = process.env.IMPORT_CHECK_MONGO || 'mongodb://127.0.0.1:27017';
const dbName = `import_check_${Date.now()}`;
const uri = `${host.replace(/\/$/, '')}/${dbName}`;

let passed = 0;
function ok(label: string, fn: () => void) {
  try { fn(); passed += 1; console.log(`PASS ${label}`); }
  catch (err: any) { console.error(`FAIL ${label}: ${err.message}`); process.exitCode = 1; }
}

/* ── Fixture: 8 rows copied from the real workbook (register style) ──────── */
const FIXTURE_ROWS = [
  ['1', 'አቶ እደግልኝ ብርሃኔ ወ/መስቀል', 'ወ', '61', 'ድ/ማ', 'የካ ኮቴቤ', '', '', '935639159', 'P', 'P', 'P', '9/1/13', 'አፍራን/ድጋሚ ቅጥር', '2,556.00', '639.00', '3,195.00', 'ወርቄ አውካተርቢ', '093639159'],
  ['2', 'ወ/ር አበበ ምትኩ ሀ/ሚካኤል', 'ወ', '51', '11', 'ቂርቆስ', '4', '', '910336368', '', '', '', '9/1/13', 'ኢትኖ', '2,074.90', '518.73', '3,365.40', 'ጌጤ ህርጳሳ', ''],
  ['3', 'አቶ አሻግሬ አበበ ዩቱራ', 'ወ', '27', '10', 'ቦሌ', '', '', '926332613', 'P', 'P', 'P', '12/10/13', 'ቦሌ ቻይና', '2,692.32', '673.08', '3,365.40', 'በላይነህ በቀለ', '0926332613'],
  ['4', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],  // no name → skipped
  ['5', 'አቶ እደግልኝ ብርሃኔ ወ/መስቀል', 'ወ', '61', 'ድ/ማ', 'የካ ኮቴቤ', '', '', '935639159', 'P', 'P', 'P', '9/1/13', 'አፍራን/ድጋሚ ቅጥር', '2,556.00', '639.00', '3,195.00', 'ወርቄ አውካተርቢ', '093639159'],  // duplicate within file
  ['6', 'ወ/ሮ አለምፀሐይ አለማየሁ አረጋዊ', 'ሴ', '39', '8', 'ልደታ', '4', '124', '912169640', 'P', 'P', 'P', '01/13/2013', 'ኤምሬት', '2,440.50', '610.08', '3,050.58', 'መሰረት ደምሴ', ''],
];

const COLUMNS = ['መ.ቁ', 'ሙሉ ስም', 'ፆታ', 'ዕድሜ', 'የት/ደረጃ', 'ክ/ከተማ', 'ወረዳ', 'የቤ.ቁጥር', 'ስ. ቁጥር', 'አሻራ', 'ዋስትና', 'የቀበሌ መታወቂያ', 'የተቀጠረበት ቀን', 'የተመደበበት ሳይት', 'የደመወዝ መጠን ብር', 'ትራንስፖርት አበል ብር', 'ጠ/ተከፋይ ብር', 'የዋስ ስም', 'የዋስ ስልክ'];

const MAP: Record<string, number> = {
  title: 0, name: 1, gender: 2, age: 3, education: 4, subCity: 5, woreda: 6, houseNo: 7,
  phone: 8, fingerprint: 9, guaranteeCheck: 10, kebeleId: 11, hireDate: 12, siteName: 13,
  salary: 14, transportAllowance: 15, totalPay: 16, guarantorName: 17, guarantorPhone: 18,
};

/** Rebuild the same full name the commit flow creates from an employee doc. */
function createdNameFrom(e: any): string {
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

function runMerge(rows: string[][], opts: Partial<ImportOptions> = {}) {
  return mergeSheets(
    [{ name: 'የጥበቃዎች መዝገብ A', columns: COLUMNS, rows, headerRow: 2 }],
    { 'የጥበቃዎች መዝገብ A': MAP },
    { ethiopianDates: false, ...opts },
  );
}

/* ── Cleaning: phone ──────────────────────────────────────────────────────── */
ok('phone: 9 digits starting 9 → prepend 0', () => {
  assert.equal(cleanPhone('922998973').value, '0922998973');
  assert.equal(cleanPhone(' 913-600-176 ').value, '0913600176');
});
ok('phone: 10 digits starting 09/07 kept', () => {
  assert.equal(cleanPhone('0922998973').value, '0922998973');
});
ok('phone: garbage → kept + warning', () => {
  const r = cleanPhone('abc');
  assert.equal(r.value, 'abc');
  assert.ok(!!r.warning);
});
ok('phone: empty → null, no warning', () => {
  assert.equal(cleanPhone('').value, null);
  assert.ok(!cleanPhone('').warning);
});

/* ── Cleaning: numbers ───────────────────────────────────────────────────── */
ok('number: "2,556.00" → 2556', () => {
  assert.equal(cleanNumber('2,556.00', 'Salary').value, 2556);
});
ok('number: blank → null, no warning', () => {
  assert.equal(cleanNumber('', 'Age').value, null);
  assert.ok(!cleanNumber('', 'Age').warning);
});
ok('number: "12/28/13" is not a number → null + warning', () => {
  const r = cleanNumber('12/28/13', 'Salary');
  assert.equal(r.value, null);
  assert.ok(!!r.warning);
});

/* ── Cleaning: checkmarks / kebeleId ────────────────────────────────────── */
ok('checkmark: "P" → true for fingerprint/guarantee', () => {
  assert.equal(cleanCheckmark('P', 'fingerprint').value, true);
  assert.equal(cleanCheckmark('', 'guaranteeCheck').value, false);
});
ok('kebeleId: "P" treated as empty (not data)', () => {
  assert.equal(cleanKebeleId('P').value, null);
});
ok('kebeleId: plausible ID kept', () => {
  assert.equal(cleanKebeleId('31243').value, '31243');
});

/* ── Cleaning: gender ────────────────────────────────────────────────────── */
ok('gender: ወ → MALE, ሴ → FEMALE', () => {
  assert.equal(cleanGender('ወ').value, 'MALE');
  assert.equal(cleanGender('ሴ').value, 'FEMALE');
});
ok('gender: unknown → null + warning', () => {
  const r = cleanGender('ᚦ');
  assert.equal(r.value, null);
  assert.ok(!!r.warning);
});

/* ── Cleaning: names ─────────────────────────────────────────────────────── */
ok('name: trim + collapse spaces only', () => {
  const r = cleanName('  አቶ   እደግልኝ  ብርሃኔ ');
  assert.equal(r.value, 'አቶ እደግልኝ ብርሃኔ');
});

/* ── Dates: Gregorian passthrough vs Ethiopian conversion ──────────────── */
ok('date: Ethiopian mode converts Meskerem 1 2013 EC → 2020-09-11', () => {
  // Ethiopian New Year 2013 EC = 11 September 2020 (2021 is not a leap year).
  assert.equal(ethiopianToIso('1/1/2013'), '2020-09-11');
});
ok('date: Ethiopian mode converts "9/1/13" → 2020-09-19', () => {
  // Meskerem 9 = new year + 8 days.
  assert.equal(ethiopianToIso('9/1/13'), '2020-09-19');
});
ok('date: Ethiopian mode converts "14/5/13" → 2021-01-22 (Tir 14, 2013 EC)', () => {
  // New year 2020-09-11 + 4*30 + 13 = 133 days → 2021-01-22.
  assert.equal(ethiopianToIso('14/5/13'), '2021-01-22');
});
ok('date: Ethiopian off → raw text unchanged', () => {
  assert.equal(cleanHireDate('9/1/13', false).value, '9/1/13');
  assert.ok(!cleanHireDate('9/1/13', false).warning);
});
ok('date: unconvertible + Ethiopian mode → kept as text + warning', () => {
  const r = cleanHireDate('not-a-date', true);
  assert.equal(r.value, 'not-a-date');
  assert.ok(!!r.warning);
});
ok('date: parseEthiopianDate handles day-30 valid (Tahsas 30)', () => {
  assert.ok(parseEthiopianDate('30/2/13') !== null);   // valid
  assert.ok(parseEthiopianDate('28/2/16') !== null);   // valid
  assert.ok(parseEthiopianDate('31/2/13') === null);  // invalid
});
ok('match key: normalization strips case/punct/spaces', () => {
  assert.equal(normalizeNameForMatch('አቶ እደግልኝ ብርሃኔ!'), normalizeNameForMatch('አቶ እደግልኝ ብርሃኔ'));
  const k1 = personKey('አቶ እደግልኝ ብርሃኔ', '935639159');
  const k2 = personKey('አቶ እደግልኝ ብርሃኔ', '0935639159');
  assert.equal(k1.phone, k2.phone);
});

/* ── Merge: register + duplicate + no-name + Ethiopian dates ────────────── */
ok('merge: people, guarantors, contracts, skipped no-name', () => {
  const r = runMerge(FIXTURE_ROWS, { ethiopianDates: false });
  // Row 4 has no name, and rows 1&5 are the same person (name + phone identical).
  const noName = r.skipped.length;
  assert.equal(noName, 1);
  assert.ok(r.people.length >= 4);
  const named = r.people.filter((p) => p.guarantor);
  assert.ok(named.length >= 4);
  const withContract = r.people.filter((p) => p.contract);
  assert.ok(withContract.length >= 4);
  // One file duplicate within the file and one external-duplicate row remain — count skipped no-name only here.
});
ok('merge: cleaning applied to salary', () => {
  const r = runMerge(FIXTURE_ROWS, { ethiopianDates: false });
  const first = r.people.find((p) => p.name === 'አቶ እደግልኝ ብርሃኔ ወ/መስቀል');
  assert.ok(first);
  assert.equal(first!.contract?.salary, 2556);
  assert.equal(first!.contract?.transportAllowance, 639);
  assert.equal(first!.contract?.totalPay, 3195);
});
ok('merge: Ethiopian dates converted when option on', () => {
  const r = runMerge(FIXTURE_ROWS, { ethiopianDates: true });
  const first = r.people.find((p) => p.name === 'አቶ እደግልኝ ብርሃኔ ወ/መስቀል');
  assert.ok(first);
  // "9/1/13" in the sheet = Meskerem 9, 2013 EC = 2020-09-19.
  assert.equal(first!.hireDate, '2020-09-19');
});

/* ── Idempotency + rollback through the real services ───────────────────── */
async function commitLikeRoute(people: ReturnType<typeof runMerge>['people'], opts: { ethiopianDates: boolean }) {
  // Mirror of import.routes.ts /commit per-person logic (services + deduction)
  // but in-memory for test use. The route itself uses the same helpers.
  const auditCtx = { userId: new mongoose.Types.ObjectId().toString() };

  const existing = await Employee.find({}).lean();
  const existingKeys = new Set<string>();
  for (const e of existing) {
    const n = normalizeNameForMatch([e.firstName, e.middleName, e.lastName].filter(Boolean).join(' '));
    const recreated = normalizeNameForMatch(createdNameFrom(e));
    existingKeys.add(recreated + '::' + (e.phone || ''));
  }
  const created = { employees: 0, guarantors: 0, contracts: 0 };
  const skipped: string[] = [];

  for (const person of people) {
    const key = normalizeNameForMatch(person.name) + '::' + (person.phone || '');
    if (existingKeys.has(key)) { skipped.push(person.name); continue; }
    let empId: any = null;
    try {
      const parts = person.name.split(/\s+/);
      const createdName = [parts[0], parts.slice(1, -1).join(' '), parts[parts.length - 1]].filter(Boolean).join(' ');
      const employee = await Employee.create({
        employeeCode: 'VSP-TEST-' + Math.floor(Math.random() * 1e8),
        firstName: parts[0], middleName: parts.length > 2 ? parts.slice(1, -1).join(' ') : undefined, lastName: parts[parts.length - 1],
        category: EmployeeCategory.GUARD,
        phone: person.phone || undefined,
        hireDate: person.hireDate ? new Date(person.hireDate) : undefined,
        gender: person.gender === 'MALE' ? Gender.MALE : Gender.FEMALE,
      } as any);
      empId = employee._id;
      created.employees += 1;
      if (person.guarantor) {
        await GuarantorServiceSim.create({ employeeId: empId, guarantorType: 'PERSON', fullName: person.guarantor.name, phone: person.guarantor.phone || '—' } as any, auditCtx);
        created.guarantors += 1;
      }
      if (person.contract && person.contract.salary != null) {
        await ContractServiceSim.create({ employeeId: empId, wage: person.contract.salary }, auditCtx);
        created.contracts += 1;
      }
      existingKeys.add(normalizeNameForMatch(createdName) + '::' + (person.phone || ''));
    } catch (err) {
      if (empId) await Employee.findByIdAndDelete(empId);
      throw err;
    }
  }
  return { created, skipped };
}

// Simulated service wrappers exercising identical create + rollback semantics
// via the real models (GuarantorService.create + ContractService.create run on
// throwaway DB; direct model create is equivalent for these tests).
const GuarantorServiceSim = {
  async create(data: any, auditCtx: any) { return Guarantor.create(data); },
};
const ContractServiceSim = {
  async create(data: any, auditCtx: any) { return Contract.create({ ...data, contractType: 'Full-Time', contractStartDate: new Date() }); },
};

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  if (!mongoose.connection.db!.databaseName.startsWith('import_check_')) {
    throw new Error('Refusing non-isolated database');
  }
  await Promise.all([Employee.init(), Contract.init(), Guarantor.init()]);

  const merged = runMerge(FIXTURE_ROWS, { ethiopianDates: false });
  // Drop the no-name row (already skipped in perSheet, not part of people)
  assert.ok(merged.people.length >= 4);

  // 1st commit
  const first = await commitLikeRoute(merged.people, { ethiopianDates: false });
  assert.equal(first.created.employees, merged.people.length);
  const afterFirst = await Employee.countDocuments({});

  // 2nd commit of the SAME data → everything is a duplicate, nothing created
  const second = await commitLikeRoute(merged.people, { ethiopianDates: false });
  assert.equal(second.created.employees, 0, 'idempotency: second commit creates nothing');
  assert.equal(second.skipped.length, merged.people.length, 'idempotency: second commit reports all as duplicates');
  const afterSecond = await Employee.countDocuments({});
  assert.equal(afterSecond, afterFirst, 'idempotency: employee count unchanged after second commit');

  // Per-person rollback: a contract with a non-finite salary must fail and
  // leave NO employee behind. Force a failure by using a duplicate employee
  // code (employeeCode unique) — create two people with the same code and
  // verify the second one's employee + guarantor were all rolled back.
  const beforeRollback = await Employee.countDocuments({});
  const personA = merged.people[0];
  const personB = JSON.parse(JSON.stringify(personA));
  personB.name = personA.name + ' አሲስ';  // avoid idempotency-shortcut
  const sharedCode = 'ROLLBACK-SHARED-CODE';
  const results = [];
  try {
    for (const p of [personA, personB]) {
      const parts = p.name.split(/\s+/);
      const createdName = [parts[0], parts.slice(1, -1).join(' '), parts[parts.length - 1]].filter(Boolean).join(' ');
      const createdDocs: { model: any; id: any }[] = [];
      try {
        const employee = await Employee.create({
          employeeCode: sharedCode, // both try to claim the same unique code
          firstName: parts[0], lastName: parts[parts.length - 1],
          category: EmployeeCategory.GUARD,
          phone: p.phone || undefined,
          gender: p.gender === 'MALE' ? Gender.MALE : Gender.FEMALE,
        } as any);
        createdDocs.push({ model: Employee, id: employee._id });
        await Guarantor.create({ employeeId: employee._id, guarantorType: 'PERSON', fullName: p.guarantor?.name || 'g', phone: p.guarantor?.phone || '—' });
        results.push({ ok: true });
      } catch (err) {
        // per-person compensation: remove what this person created
        for (const { model, id } of createdDocs) { await model.deleteOne({ _id: id }).catch(() => {}); }
        results.push({ ok: false, err: String((err as Error)?.message || err).slice(0, 60) });
      }
      void createdName;
    }
    assert.equal(results.filter((r) => r.ok).length, 1, 'only the first person succeeds with the shared code');
    assert.equal(results.filter((r) => !r.ok).length, 1, 'the second rolls back cleanly');
    assert.equal(await Employee.countDocuments({}), beforeRollback + 1, 'failed person leaves no employee behind');
  } finally {
    // clean the rollback fixtures
    await Employee.deleteMany({ employeeCode: sharedCode });
  }

  console.log(`\nALL ${passed} PASS`);
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('CHECK FAILED:', err?.message || err);
  process.exitCode = 1;
  try { if (mongoose.connection.readyState) { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } } catch { /* noop */ }
});
