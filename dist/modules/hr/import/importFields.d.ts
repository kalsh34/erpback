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
export type RecordType = 'employee' | 'guarantor' | 'contract';
export interface FieldDef {
    key: string;
    record: RecordType;
    labels: {
        en: string;
        am: string;
    };
    accepts: string[];
    numeric?: boolean;
}
export declare const IMPORT_FIELDS: FieldDef[];
/** Fields usable as an employee match key when names repeat. */
export declare const MATCH_KEY_FIELDS: string[];
/** Includes the guarantor's own phone so guarantors can be reached. */
/** Order the UI groups the mapping panel on. */
export declare const RECORD_TYPES: RecordType[];
/**
 * Normalize a header cell for matching: lowercase, strip everything that is
 * not a letter or digit (works for Ge'ez too — only punctuation/space class
 * is removed).
 */
export declare function normalizeHeader(value: unknown): string;
/**
 * Best field for a header cell: exact normalized match first, then partial
 * (prefix/containment) — but only among fields not already claimed, so a
 * column is suggested for at most one field.
 */
export declare function matchField(headerCell: string, taken: Set<string>): FieldDef | null;
/** Suggested field→column mapping for one sheet's headers (see parse service). */
export declare function suggestMapping(headers: string[]): Record<string, number>;
//# sourceMappingURL=importFields.d.ts.map