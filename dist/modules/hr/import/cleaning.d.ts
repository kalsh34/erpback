/**
 * Cleaning rules for imported Excel values. Pure functions, shared by the
 * preview (dry run) and the commit so both apply the identical logic — the
 * commit re-runs them server-side and never trusts browser-sent drafts.
 *
 * Messy source values are never auto-corrected beyond these declared rules;
 * anything that cannot be normalized stays as-is plus a warning.
 */
export interface CleanResult<T> {
    value: T | null;
    warning?: string;
}
/**
 * Phone normalization (Ethiopian mobile):
 *  - strip spaces and symbols;
 *  - 9 digits starting with 9 or 7 → prepend 0 (9xxxxxxxx → 09xxxxxxxx);
 *  - 10 digits starting 09/07 or other → keep as-is;
 *  - anything else → keep the original (trimmed) text and flag a warning.
 */
export declare function cleanPhone(raw: unknown): CleanResult<string>;
/** Numeric coercion: blanks → null; unparseable values → null + warning. */
export declare function cleanNumber(raw: unknown, label: string): CleanResult<number>;
export declare function cleanCheckmark(raw: unknown, field: 'fingerprint' | 'guaranteeCheck'): CleanResult<boolean>;
export declare function cleanKebeleId(raw: unknown): CleanResult<string>;
/** ወ (male) / ሴ (female) → the model's MALE/FEMALE. */
export declare function cleanGender(raw: unknown): CleanResult<'MALE' | 'FEMALE' | null>;
/** Names: trim + collapse repeated spaces. Nothing else is altered. */
export declare function cleanName(raw: unknown): CleanResult<string>;
/**
 * Hire date. Options:
 *  - Ethiopian calendar on → convert m/d/yy(yy) (day-first) to Gregorian ISO.
 *  - Off → store the raw text unchanged (never silently converted).
 */
export declare function cleanHireDate(raw: unknown, ethiopianMode: boolean): CleanResult<string>;
/**
 * Names repeat across sheets, so a merge key collides legitimately. The key
 * is normalised name + normalised phone; when the phone is absent the key is
 * name-only and the caller must apply the "exactly one candidate" rule.
 */
export declare function normalizeNameForMatch(raw: unknown): string;
export declare function personKey(name: unknown, phone: unknown): {
    name: string;
    phone: string | null;
    full: string;
};
//# sourceMappingURL=cleaning.d.ts.map