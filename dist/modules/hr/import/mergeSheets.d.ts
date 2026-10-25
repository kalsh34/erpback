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
    hireDate: string | null;
    siteName: string | null;
    resigned: boolean;
    /** Guarantor attached to this person (max one). */
    guarantor: {
        name: string | null;
        phone: string | null;
    } | null;
    /** Contract attached to this person (max one). */
    contract: {
        salary: number | null;
        transportAllowance: number | null;
        totalPay: number | null;
    } | null;
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
export declare function classifySheet(sheetName: string): 'register' | 'activeRoster' | 'resignedRoster' | 'unknown';
export declare function mergeSheets(sheets: {
    name: string;
    columns: string[];
    rows: string[][];
    headerRow: number | null;
}[], mappings: Record<string, FieldIndex>, opts: ImportOptions): MergeResult;
export {};
//# sourceMappingURL=mergeSheets.d.ts.map