"use strict";
/**
 * Cleaning rules for imported Excel values. Pure functions, shared by the
 * preview (dry run) and the commit so both apply the identical logic — the
 * commit re-runs them server-side and never trusts browser-sent drafts.
 *
 * Messy source values are never auto-corrected beyond these declared rules;
 * anything that cannot be normalized stays as-is plus a warning.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanPhone = cleanPhone;
exports.cleanNumber = cleanNumber;
exports.cleanCheckmark = cleanCheckmark;
exports.cleanKebeleId = cleanKebeleId;
exports.cleanGender = cleanGender;
exports.cleanName = cleanName;
exports.cleanHireDate = cleanHireDate;
exports.normalizeNameForMatch = normalizeNameForMatch;
exports.personKey = personKey;
const ethiopianDate_1 = require("./ethiopianDate");
/** Strip everything except digits, trim to a comparable phone string. */
function digitsOnly(raw) {
    return String(raw ?? '').replace(/\D+/g, '');
}
/**
 * Phone normalization (Ethiopian mobile):
 *  - strip spaces and symbols;
 *  - 9 digits starting with 9 or 7 → prepend 0 (9xxxxxxxx → 09xxxxxxxx);
 *  - 10 digits starting 09/07 or other → keep as-is;
 *  - anything else → keep the original (trimmed) text and flag a warning.
 */
function cleanPhone(raw) {
    const text = String(raw ?? '').trim();
    if (!text)
        return { value: null };
    const digits = digitsOnly(text);
    if (digits.length === 9 && (digits.startsWith('9') || digits.startsWith('7'))) {
        return { value: '0' + digits };
    }
    if (digits.length === 10 && (digits.startsWith('09') || digits.startsWith('07'))) {
        return { value: digits };
    }
    if (digits.length >= 7) {
        // e.g. landline with area code or international format — keep as-is.
        return { value: text, warning: `Phone "${text}" kept as-is (unrecognized format)` };
    }
    return { value: text, warning: `Phone "${text}" kept as-is (unrecognized format)` };
}
/** Numeric coercion: blanks → null; unparseable values → null + warning. */
function cleanNumber(raw, label) {
    const text = String(raw ?? '').trim();
    if (!text)
        return { value: null };
    const cleaned = text.replace(/[, \u00a0]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
        return { value: null, warning: `"${label}" value "${text}" is not a number` };
    }
    const n = Number(cleaned);
    return Number.isFinite(n) ? { value: n } : { value: null, warning: `"${label}" value "${text}" is not a number` };
}
/**
 * Single-letter checkmarks ("P", "✓", …) found in register sheets:
 *  - for yes/no-ish fields (fingerprint, guarantee): treat as true;
 *  - for kebeleId (an ID number, not a checkmark): "P" is not data → empty,
 *    and empty kebeleId is NOT a warning.
 */
const SINGLE_MARK = /^[A-Za-z\u2713\u2714\u221a]$/;
function cleanCheckmark(raw, field) {
    const text = String(raw ?? '').trim();
    if (!text)
        return { value: false };
    if (SINGLE_MARK.test(text))
        return { value: true };
    return { value: text.length > 0, warning: `"${field}" value "${text}" kept as free text (not a single-letter checkmark)` };
}
function cleanKebeleId(raw) {
    const text = String(raw ?? '').trim();
    if (!text)
        return { value: null };
    if (SINGLE_MARK.test(text.toLowerCase()) || /P/i.test(text) && text.length <= 2) {
        // Single-letter marks are not kebele IDs.
        if (text.length <= 2)
            return { value: null };
    }
    if (/^\d{4,}$/.test(text) || /^(?:\d+\/\d+)$/.test(text))
        return { value: text };
    return { value: text };
}
/** ወ (male) / ሴ (female) → the model's MALE/FEMALE. */
function cleanGender(raw) {
    const text = String(raw ?? '').trim();
    if (!text)
        return { value: null };
    const first = text[0];
    if (first === 'ወ')
        return { value: 'MALE' };
    if (first === 'ሴ')
        return { value: 'FEMALE' };
    const lower = text.toLowerCase();
    if (lower.startsWith('m') || lower.startsWith('male'))
        return { value: 'MALE' };
    if (lower.startsWith('f') || lower.startsWith('female'))
        return { value: 'FEMALE' };
    return { value: null, warning: `Gender "${text}" not recognized (ወ/ሴ/M/F expected)` };
}
/** Names: trim + collapse repeated spaces. Nothing else is altered. */
function cleanName(raw) {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!text)
        return { value: null };
    return { value: text };
}
/**
 * Hire date. Options:
 *  - Ethiopian calendar on → convert m/d/yy(yy) (day-first) to Gregorian ISO.
 *  - Off → store the raw text unchanged (never silently converted).
 */
function cleanHireDate(raw, ethiopianMode) {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!text)
        return { value: null };
    if (ethiopianMode) {
        const iso = (0, ethiopianDate_1.ethiopianToIso)(text);
        if (iso)
            return { value: iso };
        return { value: text, warning: `Date "${text}" could not be converted from the Ethiopian calendar; kept as-is` };
    }
    return { value: text };
}
/**
 * Names repeat across sheets, so a merge key collides legitimately. The key
 * is normalised name + normalised phone; when the phone is absent the key is
 * name-only and the caller must apply the "exactly one candidate" rule.
 */
function normalizeNameForMatch(raw) {
    // Case-free, space-free, punctuation-free (Ge'ez letters are kept).
    return String(raw ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}
function personKey(name, phone) {
    const n = normalizeNameForMatch(name);
    const p = cleanPhone(phone).value;
    return { name: n, phone: p, full: p ? `${n}::${p}` : n };
}
//# sourceMappingURL=cleaning.js.map