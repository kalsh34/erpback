"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifySheet = classifySheet;
exports.mergeSheets = mergeSheets;
const importFields_1 = require("./importFields");
const cleaning_1 = require("./cleaning");
const FIELD_BY_KEY = new Map(importFields_1.IMPORT_FIELDS.map((f) => [f.key, f]));
function cell(row, col) {
    if (col === undefined || col === null || col < 0)
        return '';
    return String(row[col] ?? '').trim();
}
function classifySheet(sheetName) {
    if (/^[A-Z]$/.test(sheetName) || sheetName.includes('መዝገብ'))
        return 'register';
    if (sheetName.includes('የለቀቁ'))
        return 'resignedRoster';
    if (sheetName.includes('አሁን'))
        return 'activeRoster';
    return 'unknown';
}
function cleanRow(sheetName, rowIndex, row, map, kind, opts) {
    const cellV = (key) => cell(row, map[key]);
    // Preserve per-row warnings on the CleanRow for the report.
    const ref = { sheet: sheetName, row: rowIndex, rawName: cellV('name') };
    const name = (0, cleaning_1.cleanName)(cellV('name')).value;
    const phoneC = (0, cleaning_1.cleanPhone)(cellV('phone'));
    const phone = phoneC.value;
    const genderC = kind === 'register' ? (0, cleaning_1.cleanGender)(cellV('gender')) : { value: null };
    const ageC = kind === 'register' ? (0, cleaning_1.cleanNumber)(cellV('age'), 'Age') : { value: null };
    const hireC = (0, cleaning_1.cleanHireDate)(cellV('hireDate'), opts.ethiopianDates);
    const guarantorName = kind === 'register' ? (0, cleaning_1.cleanName)(cellV('guarantorName')).value : null;
    const guarantorPhoneC = kind === 'register' ? (0, cleaning_1.cleanPhone)(cellV('guarantorPhone')) : { value: null };
    const salaryC = kind === 'register' ? (0, cleaning_1.cleanNumber)(cellV('salary'), 'Salary') : { value: null };
    const transportC = kind === 'register' ? (0, cleaning_1.cleanNumber)(cellV('transportAllowance'), 'Transport allowance') : { value: null };
    const totalC = kind === 'register' ? (0, cleaning_1.cleanNumber)(cellV('totalPay'), 'Total pay') : { value: null };
    const fingerC = kind === 'register' ? (0, cleaning_1.cleanCheckmark)(cellV('fingerprint'), 'fingerprint') : { value: null };
    const guaranteeC = kind === 'register' ? (0, cleaning_1.cleanCheckmark)(cellV('guaranteeCheck'), 'guaranteeCheck') : { value: null };
    const kebeleC = kind === 'register' ? (0, cleaning_1.cleanKebeleId)(cellV('kebeleId')) : { value: null };
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
function warn(list, scope, ref, message) {
    list.push({ scope, message, ref });
}
function mergeSheets(sheets, mappings, opts) {
    const perSheet = [];
    const cleanRows = [];
    // ── 1. Clean every mapped row ────────────────────────────────────────────
    for (const sheet of sheets) {
        const kind = classifySheet(sheet.name);
        if (kind === 'unknown')
            continue; // unrelated sheet — not part of this import
        const map = mappings[sheet.name] || {};
        const skipped = [];
        const ambiguous = [];
        const warnings = [];
        let counted = 0;
        sheet.rows.forEach((row, i) => {
            const nameCell = String(row[map['name'] ?? -1] ?? '').trim();
            if (!nameCell) {
                skipped.push({ ref: { sheet: sheet.name, row: i, rawName: '' }, reason: 'No name in the source row' });
                return;
            }
            const cr = cleanRow(sheet.name, i, row, map, kind, opts);
            if (cr.phoneWarning)
                warn(warnings, 'phone', cr.ref, cr.phoneWarning);
            if (cr.genderWarning)
                warn(warnings, 'gender', cr.ref, cr.genderWarning);
            if (cr.hireWarning)
                warn(warnings, 'date', cr.ref, cr.hireWarning);
            if (cr.guarantorPhoneWarning)
                warn(warnings, 'phone', cr.ref, cr.guarantorPhoneWarning);
            if (cr.salaryWarning)
                warn(warnings, 'number', cr.ref, cr.salaryWarning);
            if (cr.transportWarning)
                warn(warnings, 'number', cr.ref, cr.transportWarning);
            if (cr.totalWarning)
                warn(warnings, 'number', cr.ref, cr.totalWarning);
            cleanRows.push(cr);
            counted += 1;
        });
        perSheet.push({ sheet: sheet.name, rows: counted, skipped, ambiguous, warnings });
    }
    // ── 2. Register people first, then merge roster info into them ────────────
    const people = [];
    const byFullKey = new Map(); // name::phone
    const byNameOnly = new Map(); // name → all candidates
    const upsertPerson = (cr) => {
        if (!cr.name)
            return null;
        const key = (0, cleaning_1.personKey)(cr.name, cr.phone).full;
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
            const existingNameBucket = byNameOnly.get((0, cleaning_1.personKey)(cr.name, '').name) || [];
            existingNameBucket.push(person);
            byNameOnly.set((0, cleaning_1.personKey)(cr.name, '').name, existingNameBucket);
        }
        person.sources.push(cr.ref);
        return person;
    };
    // Register sheets are the main source of detail.
    for (const cr of cleanRows.filter((r) => r.kind === 'register')) {
        const person = upsertPerson(cr);
        if (!person)
            continue;
        if (!person.phone && cr.phone)
            person.phone = cr.phone;
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
        if (cr.siteName && (!person.siteName || person.siteName === cr.siteName))
            person.siteName = cr.siteName;
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
        }
        else if (person.contract && cr.salary != null && person.contract.salary == null) {
            person.contract.salary = cr.salary;
        }
        if ((cr.guarantorName || cr.guarantorPhone) && !person.guarantor) {
            person.guarantor = { name: cr.guarantorName, phone: cr.guarantorPhone };
        }
        if (warningsExist(cr))
            copyRowWarnings(cr, person.warnings, person.sources[person.sources.length - 1]);
    }
    // Active roster: confirm ACTIVE + fill missing phone / site / title.
    for (const cr of cleanRows.filter((r) => r.kind === 'activeRoster')) {
        const target = findMatch(cr, byFullKey, byNameOnly, perSheet);
        if (target === 'ambiguous' || !target)
            continue; // ambiguity already recorded
        target.resigned = false;
        if (!target.phone && cr.phone) {
            target.phone = cr.phone;
            rebuildKey(target, byFullKey, byNameOnly);
        }
        if (!target.siteName && cr.siteName)
            target.siteName = cr.siteName;
        if (!target.title && cr.title)
            target.title = cr.title;
    }
    // Resigned roster: mark inactive.
    for (const cr of cleanRows.filter((r) => r.kind === 'resignedRoster')) {
        const target = findMatch(cr, byFullKey, byNameOnly, perSheet);
        if (target === 'ambiguous' || !target)
            continue;
        target.resigned = true;
        if (!target.phone && cr.phone) {
            target.phone = cr.phone;
            rebuildKey(target, byFullKey, byNameOnly);
        }
        if (!target.siteName && cr.siteName)
            target.siteName = cr.siteName;
        if (!target.title && cr.title)
            target.title = cr.title;
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
function warningsExist(cr) {
    return !!(cr.phoneWarning || cr.genderWarning || cr.hireWarning || cr.guarantorPhoneWarning ||
        cr.salaryWarning || cr.transportWarning || cr.totalWarning);
}
function copyRowWarnings(cr, list, ref) {
    if (cr.phoneWarning)
        warn(list, 'phone', ref, cr.phoneWarning);
    if (cr.genderWarning)
        warn(list, 'gender', ref, cr.genderWarning);
    if (cr.hireWarning)
        warn(list, 'date', ref, cr.hireWarning);
    if (cr.guarantorPhoneWarning)
        warn(list, 'phone', ref, cr.guarantorPhoneWarning);
    if (cr.salaryWarning)
        warn(list, 'number', ref, cr.salaryWarning);
    if (cr.transportWarning)
        warn(list, 'number', ref, cr.transportWarning);
    if (cr.totalWarning)
        warn(list, 'number', ref, cr.totalWarning);
}
function rebuildKey(person, byFullKey, byNameOnly) {
    const oldKey = person.key;
    const newKey = (0, cleaning_1.personKey)(person.name, person.phone).full;
    if (oldKey === newKey)
        return;
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
function findMatch(cr, byFullKey, byNameOnly, perSheet) {
    if (!cr.name)
        return null;
    const { name } = (0, cleaning_1.personKey)(cr.name, cr.phone || '');
    if (cr.phone) {
        const fullKey = (0, cleaning_1.personKey)(cr.name, cr.phone).full;
        const direct = byFullKey.get(fullKey);
        if (direct)
            return direct;
    }
    const candidates = byNameOnly.get(name) || [];
    if (candidates.length === 1)
        return candidates[0];
    const sheetReport = perSheet.find((s) => s.sheet === cr.ref.sheet);
    const reason = candidates.length === 0
        ? 'Roster row does not match any register row by name'
        : `Name matches ${candidates.length} people without a phone — ambiguous, not merged`;
    if (sheetReport) {
        sheetReport.ambiguous.push({ ref: cr.ref, name: cr.name, reason });
    }
    return 'ambiguous';
}
//# sourceMappingURL=mergeSheets.js.map