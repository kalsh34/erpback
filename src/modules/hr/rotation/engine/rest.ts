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

import { RestRule } from './types';
import { HOUR_MS } from './time';

export const DEFAULT_REST_RULES: RestRule[] = [
  { maxShiftHours: 12, minRestHours: 24 },
  { maxShiftHours: 24, minRestHours: 48 },
];

export function normalizeRestRules(rules?: RestRule[] | null): RestRule[] {
  if (!rules || rules.length === 0) return DEFAULT_REST_RULES.map((r) => ({ ...r }));
  const cleaned = rules
    .filter((r) => r && typeof r.maxShiftHours === 'number' && typeof r.minRestHours === 'number')
    .map((r) => ({ maxShiftHours: r.maxShiftHours, minRestHours: r.minRestHours }))
    .sort((a, b) => a.maxShiftHours - b.maxShiftHours);
  return cleaned.length > 0 ? cleaned : DEFAULT_REST_RULES.map((r) => ({ ...r }));
}

/** Minimum rest (in hours) required after a shift of `durationHours`. */
export function minRestHoursAfter(durationHours: number, rules: RestRule[]): number {
  const sorted = [...rules].sort((a, b) => a.maxShiftHours - b.maxShiftHours);
  for (const r of sorted) {
    if (durationHours <= r.maxShiftHours + 1e-9) return r.minRestHours;
  }
  // No configured rule covers this duration: scale, with a 24h floor.
  return Math.max(24, Math.ceil(durationHours * 2));
}

export function minRestMsAfter(durationHours: number, rules: RestRule[]): number {
  return Math.round(minRestHoursAfter(durationHours, rules) * HOUR_MS);
}

/**
 * Stable fingerprint of the scheduling rules — stored with every generation so
 * a historical rotation can always explain which rule set produced it
 * (PHASE 7: changing a rule must not silently alter published rotations).
 */
export function rulesFingerprint(shiftsJson: string, rules: RestRule[]): string {
  const payload = shiftsJson + '|' + JSON.stringify([...rules].sort((a, b) => a.maxShiftHours - b.maxShiftHours));
  // FNV-1a 32-bit — deterministic, dependency-free.
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
