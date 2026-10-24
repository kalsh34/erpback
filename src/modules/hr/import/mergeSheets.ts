import { IMPORT_FIELDS, MATCH_KEY_FIELDS } from './importFields';
import {
  cleanPhone, cleanNumber, cleanName, cleanGender, cleanHireDate,
  cleanCheckmark, cleanKebeleId, personKey,
} from './cleaning';

/**
 * Merge layer: turns parsed sheets + per-sheet mapping + options into a
 * person-centric view. Register sheets carry the full detail (main source);
 * the active roster confirms active status and fills missing phone / site /
 * title; the resigned roster marks people with the model's own inactive value.
 *
 * People from different sheets are merged by normalised name + normalised
 * phone. When the phone is missing on one side, name-only matching is allowed
 * only when exactly one candidate exists — otherwise the row is reported as
 * ambiguous and NOT merged.
 *
 * Pure computation: no model import, no persistence.
 */

export interface ImportOptions {
  /** "Dates are Ethiopian calendar" toggle chosen by the operator. */
  ethiopianDates: boolean;
  /** Default department / contractType / position for the created contracts. */
  defaultDepartment?: string;
  defaultContractType?: string;
  defaultPosition?: string;
}

export interface RowRef {
  sheet: string;
  /** 0-based index within the sheet's data rows. */
  row: number;
  rawName: string;
}

export interface ImportWarning {
  scope: 'phone' | 'number' | 'date' | 'gender' | 'other';
  message: string;
  ref: RowRef;
}

export interface SkippedRow {
  ref: RowRef;
  reason: string;
}

export interface AmbiguousRow {
  ref: RowRef;
  name: string;
  reason: string;
}

export interface PersonDraft {
  /** Normalised identity: name + phone (or name-only). */
  key: string;
  name: string;
  phone: string | null;
  title: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  age: number | null;
  education: string | null;
  subCity: string | null;
  woreda: string | null;
  houseNo: string | null;
  kebeleId: string | null;
  fingerprint: boolean | null;
  guaranteeCheck: boolean | null;
  hireDate: string | null;   // ISO when Ethiopian mode, raw text otherwise
  siteName: string | null;
  resigned: boolean;
  /** Guarantor attached to this person (max one). */
  guarantor: { name: string | null; phone: string | null } | null;
  /** Contract attached to this person (max one). */
  contract: { salary: number | null; transportAllowance: number | null; totalPay: number | null } | null;
  sources: RowRef[];
  warnings: ImportWarning[];
}

export interface SheetMergeReport {
  sheet: string;
  rows: number;
  skipped: SkippedRow[];
  ambiguous: AmbiguousRow[];
  warnings: ImportWarning[];
}

export interface MergeResult {
  people: PersonDraft[];
  perSheet: SheetMergeReport[];
  warnings: ImportWarning[];
  skipped: SkippedRow[];
  ambiguous: AmbiguousRow[];
}

interface FieldIndex {
  [key: string]: number | undefined;
}

const FIELD_BY_KEY = new Map(IMPORT_FIELDS.map((f) => [f.key, f]));

function cell(row: string[], col: number | undefined): string {
  if (col === undefined || col === null || col < 0) return '';
  return String(row[col] ?? '').trim();
}

/**
 * Build an intermediate sheet-row view with cleaning applied, keeping the
 * sheet + row reference for the report.
 */
interface CleanRow {
  ref: RowRef;
  kind: 'register' | 'activeRoster' | 'resignedRoster';
  name: string | null;
  title: string | null;
  phone: string | null;
  phoneWarning?: string;
  gender: 'MALE' | 'FEMALE' | null;
  genderWarning?: string;
  age: number | null;
  education: string | null;
  subCity: string | null;
  woreda: string | null;
  houseNo: string | null;
  kebeleId: string | null;
  fingerprint: boolean | null;
  guaranteeCheck: boolean | null;
  hireDate: string | null;
  hireWarning?: string;
  siteName: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  guarantorPhoneWarning?: string;
  salary: number | null;
  salaryWarning?: string;
  transportAllowance: number | null;
  transportWarning?: string;
  totalPay: number | null;
  totalWarning?: string;
}

export function classifySheet(sheetName: string): 'register' | 'activeRoster' | 'resignedRoster' | 'unknown' {
  if (/^[A-Z]$/.test(sheetName) || sheetName.includes('መዝገብ')) return 'register';
  if (sheetName.includes('የለቀቁ')) return 'resignedRoster';
  if (sheetName.includes('አሁን')) return 'activeRoster';
  return 'unknown';
}

function cleanRow(
  sheetName: string, rowIndex: number, row: string[], map: FieldIndex, kind: 'register' | 'activeRoster' | 'resignedRoster', opts: ImportOptions,
): CleanRow {
  const cellV = (key: string) => cell(row, map[key]);
  // Preserve per-row warnings on the CleanRow for the report.
  const ref: RowRef = { sheet: sheetName, row: rowIndex, rawName: cellV('name') };
  const name = cleanName(cellV('name')).value;
  const phoneC = cleanPhone(cellV('phone'));
  const phone = phoneC.value;
  const genderC = kind === 'register' ? cleanGender(cellV('gender')) : { value: null as 'MALE' | 'FEMALE' | null };
  const ageC = kind === 'register' ? cleanNumber(cellV('age'), 'Age') : { value: null as number | null };
  const hireC = cleanHireDate(cellV('hireDate'), opts.ethiopianDates);
  const guarantorName = kind === 'register' ? cleanName(cellV('guarantorName')).value : null;
  const guarantorPhoneC = kind === 'register' ? cleanPhone(cellV('guarantorPhone')) : { value: null as string | null };
  const salaryC = kind === 'register' ? cleanNumber(cellV('salary'), 'Salary') : { value: null as number | null };
  const transportC = kind === 'register' ? cleanNumber(cellV('transportAllowance'), 'Transport allowance') : { value: null as number | null };
  const totalC = kind === 'register' ? cleanNumber(cellV('totalPay'), 'Total pay') : { value: null as number | null };
  const fingerC = kind === 'register' ? cleanCheckmark(cellV('fingerprint'), 'fingerprint') : { value: null as boolean | null };
  const guaranteeC = kind === 'register' ? cleanCheckmark(cellV('guaranteeCheck'), 'guaranteeCheck') : { value: null as boolean | null };
  const kebeleC = kind === 'register' ? cleanKebeleId(cellV('kebeleId')) : { value: null as string | null };

  return {
    ref,
    kind,
    name,
    title: kind !== 'register' ? (cellV('title') || null) : null,
    phone,
    phoneWarning: phoneC.warning,
    gender: genderC.value,
    genderWarning: genderC.warning,
    age: ageC.value,
    education: kind === 'register' ? cellV('education') || null : null,
    subCity: kind === 'register' ? cellV('subCity') || null : null,
    woreda: kind === 'register' ? cellV('woreda') || null : null,
    houseNo: kind === 'register' ? cellV('houseNo') || null : null,
    kebeleId: kebeleC.value,
    fingerprint: fingerC.value,
    guaranteeCheck: guaranteeC.value,
    hireDate: hireC.value,
    hireWarning: hireC.warning,
    siteName: cellV('siteName') || null,
    guarantorName,
    guarantorPhone: guarantorPhoneC.value,
    guarantorPhoneWarning: guarantorPhoneC.warning,
    salary: salaryC.value,
    salaryWarning: salaryC.warning,
    transportAllowance: transportC.value,
    transportWarning: transportC.warning,
    totalPay: totalC.value,
    totalWarning: totalC.warning,
  };
}

function warn(list: ImportWarning[], scope: ImportWarning['scope'], ref: RowRef, message: string) {
  list.push({ scope, message, ref });
}

export function mergeSheets(
  sheets: { name: string; columns: string[]; rows: string[][]; headerRow: number | null }[],
  mappings: Record<string, FieldIndex>,
  opts: ImportOptions,
): MergeResult {
  const perSheet: SheetMergeReport[] = [];
  const cleanRows: CleanRow[] = [];

  // ── 1. Clean every mapped row ────────────────────────────────────────────
  for (const sheet of sheets) {
    const kind = classifySheet(sheet.name);
    if (kind === 'unknown') continue; // unrelated sheet — not part of this import
    const map = mappings[sheet.name] || {};
    const skipped: SkippedRow[] = [];
    const ambiguous: AmbiguousRow[] = [];
    const warnings: ImportWarning[] = [];
    let counted = 0;

    sheet.rows.forEach((row, i) => {
      const nameCell = String(row[map['name'] ?? -1] ?? '').trim();
      if (!nameCell) {
        skipped.push({ ref: { sheet: sheet.name, row: i, rawName: '' }, reason: 'No name in the source row' });
        return;
      }
      const cr = cleanRow(sheet.name, i, row, map, kind, opts);
      if (cr.phoneWarning) warn(warnings, 'phone', cr.ref, cr.phoneWarning);
      if (cr.genderWarning) warn(warnings, 'gender', cr.ref, cr.genderWarning);
      if (cr.hireWarning) warn(warnings, 'date', cr.ref, cr.hireWarning);
      if (cr.guarantorPhoneWarning) warn(warnings, 'phone', cr.ref, cr.guarantorPhoneWarning);
      if (cr.salaryWarning) warn(warnings, 'number', cr.ref, cr.salaryWarning);
      if (cr.transportWarning) warn(warnings, 'number', cr.ref, cr.transportWarning);
      if (cr.totalWarning) warn(warnings, 'number', cr.ref, cr.totalWarning);
      cleanRows.push(cr);
      counted += 1;
    });

    perSheet.push({ sheet: sheet.name, rows: counted, skipped, ambiguous, warnings });
  }

  // ── 2. Register people first, then merge roster info into them ────────────
  const people: PersonDraft[] = [];
  const byFullKey = new Map<string, PersonDraft>();     // name::phone
  const byNameOnly = new Map<string, PersonDraft[]>();  // name → all candidates

  const upsertPerson = (cr: CleanRow): PersonDraft | null => {
    if (!cr.name) return null;
    const key = personKey(cr.name, cr.phone).full;
    let person = byFullKey.get(key);
    if (!person) {
      person = {
        key,
        name: cr.name,
        phone: cr.phone,
        title: null,
        gender: null,
        age: null,
        education: null,
        subCity: null,
        woreda: null,
        houseNo: null,
        kebeleId: null,
        fingerprint: null,
        guaranteeCheck: null,
        hireDate: null,
        siteName: null,
        resigned: false,
        guarantor: null,
        contract: null,
        sources: [],
        warnings: [],
      };
      people.push(person);
      byFullKey.set(key, person);
      const existingNameBucket = byNameOnly.get(personKey(cr.name, '').name) || [];
      existingNameBucket.push(person);
      byNameOnly.set(personKey(cr.name, '').name, existingNameBucket);
    }
    person.sources.push(cr.ref);
    return person;
  };

  // Register sheets are the main source of detail.
  for (const cr of cleanRows.filter((r) => r.kind === 'register')) {
    const person = upsertPerson(cr);
    if (!person) continue;
    if (!person.phone && cr.phone) person.phone = cr.phone;
    person.gender = person.gender ?? cr.gender;
    person.age = person.age ?? cr.age;
    person.education = person.education ?? cr.education;
    person.subCity = person.subCity ?? cr.subCity;
    person.woreda = person.woreda ?? cr.woreda;
    person.houseNo = person.houseNo ?? cr.houseNo;
    person.kebeleId = person.kebeleId ?? cr.kebeleId;
    person.fingerprint = person.fingerprint ?? cr.fingerprint;
    person.guaranteeCheck = person.guaranteeCheck ?? cr.guaranteeCheck;
    person.hireDate = person.hireDate ?? cr.hireDate;
    if (cr.siteName && (!person.siteName || person.siteName === cr.siteName)) person.siteName = cr.siteName;
    else if (cr.siteName && person.siteName && person.siteName !== cr.siteName) {
      warn(person.warnings, 'other', cr.ref, `Site differs across rows ("${person.siteName}" vs "${cr.siteName}")`);
    }
    person.title = person.title ?? cr.title;
    if ((cr.salary != null || cr.transportAllowance != null || cr.totalPay != null) && !person.contract) {
      person.contract = {
        salary: cr.salary,
        transportAllowance: cr.transportAllowance,
        totalPay: cr.totalPay,
      };
    } else if (person.contract && cr.salary != null && person.contract.salary == null) {
      person.contract.salary = cr.salary;
    }
    if ((cr.guarantorName || cr.guarantorPhone) && !person.guarantor) {
      person.guarantor = { name: cr.guarantorName, phone: cr.guarantorPhone };
    }
    if (warningsExist(cr)) copyRowWarnings(cr, person.warnings, person.sources[person.sources.length - 1]);
  }

  // Active roster: confirm ACTIVE + fill missing phone / site / title.
  for (const cr of cleanRows.filter((r) => r.kind === 'activeRoster')) {
    const target = findMatch(cr, byFullKey, byNameOnly, perSheet);
    if (target === 'ambiguous' || !target) continue; // ambiguity already recorded
    target.resigned = false;
    if (!target.phone && cr.phone) { target.phone = cr.phone; rebuildKey(target, byFullKey, byNameOnly); }
    if (!target.siteName && cr.siteName) target.siteName = cr.siteName;
    if (!target.title && cr.title) target.title = cr.title;
  }

  // Resigned roster: mark inactive.
  for (const cr of cleanRows.filter((r) => r.kind === 'resignedRoster')) {
    const target = findMatch(cr, byFullKey, byNameOnly, perSheet);
    if (target === 'ambiguous' || !target) continue;
    target.resigned = true;
    if (!target.phone && cr.phone) { target.phone = cr.phone; rebuildKey(target, byFullKey, byNameOnly); }
    if (!target.siteName && cr.siteName) target.siteName = cr.siteName;
    if (!target.title && cr.title) target.title = cr.title;
  }

  const allWarnings = perSheet.flatMap((s) => s.warnings);
  const allSkipped = perSheet.flatMap((s) => s.skipped);
  const allAmbiguous = perSheet.flatMap((s) => s.ambiguous);
  const personWarnings = people.flatMap((p) => p.warnings);

  return {
    people,
    perSheet,
    warnings: [...allWarnings, ...personWarnings],
    skipped: allSkipped,
    ambiguous: allAmbiguous,
  };
}

function warningsExist(cr: CleanRow): boolean {
  return !!(cr.phoneWarning || cr.genderWarning || cr.hireWarning || cr.guarantorPhoneWarning ||
    cr.salaryWarning || cr.transportWarning || cr.totalWarning);
}

function copyRowWarnings(cr: CleanRow, list: ImportWarning[], ref: RowRef) {
  if (cr.phoneWarning) warn(list, 'phone', ref, cr.phoneWarning);
  if (cr.genderWarning) warn(list, 'gender', ref, cr.genderWarning);
  if (cr.hireWarning) warn(list, 'date', ref, cr.hireWarning);
  if (cr.guarantorPhoneWarning) warn(list, 'phone', ref, cr.guarantorPhoneWarning);
  if (cr.salaryWarning) warn(list, 'number', ref, cr.salaryWarning);
  if (cr.transportWarning) warn(list, 'number', ref, cr.transportWarning);
  if (cr.totalWarning) warn(list, 'number', ref, cr.totalWarning);
}

function rebuildKey(person: PersonDraft, byFullKey: Map<string, PersonDraft>, byNameOnly: Map<string, PersonDraft[]>) {
  const oldKey = person.key;
  const newKey = personKey(person.name, person.phone).full;
  if (oldKey === newKey) return;
  byFullKey.delete(oldKey);
  person.key = newKey;
  byFullKey.set(newKey, person);
}

/**
 * Match a roster row to an existing register person:
 *  1. name + phone key → direct hit;
 *  2. name only → allowed only when exactly one candidate exists;
 *  3. otherwise → ambiguous, reported and skipped.
 * Returns 'ambiguous' when ambiguity was detected and recorded.
 */
function findMatch(
  cr: CleanRow,
  byFullKey: Map<string, PersonDraft>,
  byNameOnly: Map<string, PersonDraft[]>,
  perSheet: SheetMergeReport[],
): PersonDraft | 'ambiguous' | null {
  if (!cr.name) return null;
  const { name } = personKey(cr.name, cr.phone || '');
  if (cr.phone) {
    const fullKey = personKey(cr.name, cr.phone).full;
    const direct = byFullKey.get(fullKey);
    if (direct) return direct;
  }
  const candidates = byNameOnly.get(name) || [];
  if (candidates.length === 1) return candidates[0];
  const sheetReport = perSheet.find((s) => s.sheet === cr.ref.sheet);
  const reason = candidates.length === 0
    ? 'Roster row does not match any register row by name'
    : `Name matches ${candidates.length} people without a phone — ambiguous, not merged`;
  if (sheetReport) {
    sheetReport.ambiguous.push({ ref: cr.ref, name: cr.name, reason });
  }
  return 'ambiguous';
}
