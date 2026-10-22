"use strict";
/**
 * Central field catalogue for the Excel importer.
 *
 * Adding support for a new spreadsheet column means adding one entry here —
 * nothing else. Every importable system field declares:
 *   - key            stable identifier shared with the frontend and the draft JSON
 *   - record         which draft record the value belongs to (employee/guarantor/contract)
 *   - labels         English + Amharic display labels
 *   - accepts        header names that map to this field (matched ignoring
 *                    case, spaces and punctuation; exact match before partial)
 *   - numeric        when true the cell value is converted to a number, blanks → null
 *
 * READ-ONLY phase: this module touches no model, no database.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORD_TYPES = exports.MATCH_KEY_FIELDS = exports.IMPORT_FIELDS = void 0;
exports.normalizeHeader = normalizeHeader;
exports.matchField = matchField;
exports.suggestMapping = suggestMapping;
exports.IMPORT_FIELDS = [
    // ── Employee ────────────────────────────────────────────────────────────
    {
        key: 'name', record: 'employee',
        labels: { en: 'Full name', am: 'ሙሉ ስም' },
        // NB: no bare "ስም"/"Name" — they would partially match "የዋስ ስም"/"Guarantor name".
        accepts: ['ሙሉ ስም', 'ስም ከነአያት', 'ስም ከአያት', 'Full name', 'Employee name', 'Name with relatives'],
    },
    {
        key: 'title', record: 'employee',
        labels: { en: 'Title', am: 'ማዕረግ' },
        accepts: ['ማዕረግ', 'Title'],
    },
    {
        key: 'phone', record: 'employee',
        labels: { en: 'Phone', am: 'ስልክ' },
        accepts: ['ስ. ቁጥር', 'ስ.ቁጥር', 'ስ ቁጥር', 'ስልክ', 'Phone', 'Phone number', 'Mobile'],
    },
    {
        key: 'gender', record: 'employee',
        labels: { en: 'Gender', am: 'ፆታ' },
        accepts: ['ፆታ', 'Gender', 'Sex'],
    },
    {
        key: 'age', record: 'employee',
        labels: { en: 'Age', am: 'ዕድሜ' },
        accepts: ['ዕድሜ', 'ድሜ', 'Age'],
        numeric: true,
    },
    {
        key: 'education', record: 'employee',
        labels: { en: 'Education level', am: 'የትምህርት ደረጃ' },
        accepts: ['የት/ደረጃ', 'የትምህርት ደረጃ', 'Education level', 'Education'],
    },
    {
        key: 'subCity', record: 'employee',
        labels: { en: 'Sub-city', am: 'ክ/ከተማ' },
        accepts: ['ክ/ከተማ', 'ክ ከተማ', 'Sub-city', 'Sub city'],
    },
    {
        key: 'woreda', record: 'employee',
        labels: { en: 'Woreda', am: 'ወረዳ' },
        accepts: ['ወረዳ', 'Woreda', 'Wereda'],
    },
    {
        key: 'houseNo', record: 'employee',
        labels: { en: 'House no.', am: 'የቤት ቁጥር' },
        accepts: ['የቤ.ቁጥር', 'የቤት ቁጥር', 'House no', 'House number'],
    },
    {
        key: 'kebeleId', record: 'employee',
        labels: { en: 'Kebele ID', am: 'የቀበሌ መታወቂያ' },
        accepts: ['የቀበሌ መታወቂያ', 'Kebele ID', 'Kebele identification'],
    },
    {
        key: 'fingerprint', record: 'employee',
        labels: { en: 'Fingerprint', am: 'አሻራ' },
        accepts: ['አሻራ', 'Fingerprint'],
    },
    {
        key: 'guaranteeCheck', record: 'employee',
        labels: { en: 'Guarantee', am: 'ዋስትና' },
        accepts: ['ዋስትና', 'Guarantee'],
    },
    {
        key: 'hireDate', record: 'employee',
        labels: { en: 'Hire date', am: 'የተቀጠረበት ቀን' },
        accepts: ['የተቀጠረበት ቀን', 'የተቀጠረበት', 'Hire date', 'Date hired'],
    },
    {
        key: 'siteName', record: 'employee',
        labels: { en: 'Assigned site', am: 'የተመደበበት ሳይት' },
        accepts: ['የተመደበበት ሳይት', 'መደበኛሥራ ቦታ', 'Assigned site', 'Work site', 'Site'],
    },
    {
        key: 'extraDuty', record: 'employee',
        labels: { en: 'Extra duty', am: 'ተጨማሪ ሥራ' },
        accepts: ['ተጨማሪ ሥራ', 'Extra work', 'Extra duty'],
    },
    // ── Contract ────────────────────────────────────────────────────────────
    {
        key: 'salary', record: 'contract',
        labels: { en: 'Salary (ETB)', am: 'ደመወዝ (ብር)' },
        accepts: ['የደመወዝ መጠን ብር', 'የደመወዝ', 'Salary amount in Birr', 'Salary in Birr', 'Salary'],
        numeric: true,
    },
    {
        key: 'transportAllowance', record: 'contract',
        labels: { en: 'Transport allowance', am: 'ትራንስፖርት አበል' },
        accepts: ['ትራንስፖርት አበል ብር', 'ትራንስፖ', 'Transport allowance in Birr', 'Transport allowance', 'Transport'],
        numeric: true,
    },
    {
        key: 'totalPay', record: 'contract',
        labels: { en: 'Total pay', am: 'ጠቅላላ የተከፋይ' },
        accepts: ['ጠ/ተከፋይ ብር', 'ጠ/ተከፋይ', 'Total payer in Birr', 'Total pay in Birr', 'Total pay', 'Total'],
        numeric: true,
    },
    // ── Guarantor ───────────────────────────────────────────────────────────
    {
        key: 'guarantorName', record: 'guarantor',
        labels: { en: 'Guarantor name', am: 'የዋስ ስም' },
        accepts: ['የዋስ ስም', 'የዋስ', 'Guarantor name'],
    },
    {
        key: 'guarantorPhone', record: 'guarantor',
        labels: { en: 'Guarantor phone', am: 'የዋስ ስልክ' },
        accepts: ['የዋስ ስልክ', 'Guarantor phone', 'Guarantor phone number'],
    },
];
/** Fields usable as an employee match key when names repeat. */
exports.MATCH_KEY_FIELDS = ['phone', 'kebeleId'];
/** Includes the guarantor's own phone so guarantors can be reached. */
/** Order the UI groups the mapping panel on. */
exports.RECORD_TYPES = ['employee', 'guarantor', 'contract'];
/**
 * Normalize a header cell for matching: lowercase, strip everything that is
 * not a letter or digit (works for Ge'ez too — only punctuation/space class
 * is removed).
 */
function normalizeHeader(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}
/**
 * Best field for a header cell: exact normalized match first, then partial
 * (prefix/containment) — but only among fields not already claimed, so a
 * column is suggested for at most one field.
 */
function matchField(headerCell, taken) {
    const norm = normalizeHeader(headerCell);
    if (!norm)
        return null;
    let partial = null;
    for (const f of exports.IMPORT_FIELDS) {
        if (taken.has(f.key))
            continue;
        for (const a of f.accepts) {
            const na = normalizeHeader(a);
            if (!na)
                continue;
            if (norm === na)
                return f; // exact beats partial
            if (!partial && (norm.startsWith(na) || na.startsWith(norm) || norm.includes(na) || na.includes(norm))) {
                partial = f;
            }
        }
    }
    return partial;
}
/** Suggested field→column mapping for one sheet's headers (see parse service). */
function suggestMapping(headers) {
    const taken = new Set();
    const suggestion = {};
    headers.forEach((h, colIndex) => {
        const f = matchField(h, taken);
        if (f) {
            suggestion[f.key] = colIndex;
            taken.add(f.key);
        }
    });
    return suggestion;
}
//# sourceMappingURL=importFields.js.map