"use strict";
/**
 * Configurable rest (recovery) rules.
 *
 * Defaults (PHASE 6/7):  12h shift -> 24h rest,  24h shift -> 48h rest.
 * Rest is computed from TIMESTAMPS, never from calendar dates.
 *
 * Lookup: first rule whose maxShiftHours >= shift duration wins (rules are
 * sorted ascending). If no configured rule covers the duration, rest scales at
 * 2x the shift duration (with a 24h floor for shifts <= 12h) so unusual custom
 * shifts still get a sane recovery target.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REST_RULES = void 0;
exports.normalizeRestRules = normalizeRestRules;
exports.minRestHoursAfter = minRestHoursAfter;
exports.minRestMsAfter = minRestMsAfter;
exports.rulesFingerprint = rulesFingerprint;
const time_1 = require("./time");
exports.DEFAULT_REST_RULES = [
    { maxShiftHours: 12, minRestHours: 24 },
    { maxShiftHours: 24, minRestHours: 48 },
];
function normalizeRestRules(rules) {
    if (!rules || rules.length === 0)
        return exports.DEFAULT_REST_RULES.map((r) => ({ ...r }));
    const cleaned = rules
        .filter((r) => r && typeof r.maxShiftHours === 'number' && typeof r.minRestHours === 'number')
        .map((r) => ({ maxShiftHours: r.maxShiftHours, minRestHours: r.minRestHours }))
        .sort((a, b) => a.maxShiftHours - b.maxShiftHours);
    return cleaned.length > 0 ? cleaned : exports.DEFAULT_REST_RULES.map((r) => ({ ...r }));
}
/** Minimum rest (in hours) required after a shift of `durationHours`. */
function minRestHoursAfter(durationHours, rules) {
    const sorted = [...rules].sort((a, b) => a.maxShiftHours - b.maxShiftHours);
    for (const r of sorted) {
        if (durationHours <= r.maxShiftHours + 1e-9)
            return r.minRestHours;
    }
    // No configured rule covers this duration: scale, with a 24h floor.
    return Math.max(24, Math.ceil(durationHours * 2));
}
function minRestMsAfter(durationHours, rules) {
    return Math.round(minRestHoursAfter(durationHours, rules) * time_1.HOUR_MS);
}
/**
 * Stable fingerprint of the scheduling rules — stored with every generation so
 * a historical rotation can always explain which rule set produced it
 * (PHASE 7: changing a rule must not silently alter published rotations).
 */
function rulesFingerprint(shiftsJson, rules) {
    const payload = shiftsJson + '|' + JSON.stringify([...rules].sort((a, b) => a.maxShiftHours - b.maxShiftHours));
    // FNV-1a 32-bit — deterministic, dependency-free.
    let h = 0x811c9dc5;
    for (let i = 0; i < payload.length; i++) {
        h ^= payload.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
}
//# sourceMappingURL=rest.js.map