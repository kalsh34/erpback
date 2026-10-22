/**
 * Draft record builder. Turns a parsed sheet + the operator's mapping into
 * draft Employee / Guarantor / Contract rows. Pure functions on plain data:
 * no model import, no persistence, nothing to wire up later except validation
 * before insert (out-of-scope commit endpoint).
 */
export interface MappedColumnSpec {
    /** field key → source column index in the sheet's text row array */
    [fieldKey: string]: number | undefined;
}
export type SheetKind = 'all' | 'employee' | 'guarantor' | 'contract';
export interface BuildDraftsInput {
    /** The sheet's physical columns in order. */
    columns: string[];
    /** Text rows from the parser (same order as columns). */
    rows: string[][];
    /** Active mapping for this sheet: field key → column index. */
    mapping: MappedColumnSpec;
    /** Restrict which record types this sheet produces (default: all). */
    kind?: SheetKind;
    /** Sheet name, stamped on every draft for traceability. */
    sheetName: string;
}
export interface MatchKey {
    field: string;
    value: string;
}
export interface DraftEmployee {
    sheet: string;
    rowIndex: number;
    [fieldKey: string]: unknown;
}
export interface DraftGuarantor {
    sheet: string;
    rowIndex: number;
    employee: {
        /** Value of the mapped `name` field for the employee this belongs to. */
        name: string | null;
        /** Any mapped match-key fields (phone / kebeleId) for reliable matching later. */
        matchKeys: MatchKey[];
    };
    guarantorName: string | null;
}
export interface DraftContract {
    sheet: string;
    rowIndex: number;
    employee: {
        name: string | null;
        matchKeys: MatchKey[];
    };
    salary: number | null;
    transportAllowance: number | null;
    totalPay: number | null;
    /** Any other contract-record field the operator mapped goes here. */
    [fieldKey: string]: unknown;
}
export interface DraftResult {
    employees: DraftEmployee[];
    guarantors: DraftGuarantor[];
    contracts: DraftContract[];
    /** Rows skipped for having no mapped name value. */
    skippedNoName: number;
    /** Total rows considered for this sheet. */
    totalRows: number;
}
export declare function buildDrafts(input: BuildDraftsInput): DraftResult;
//# sourceMappingURL=draftBuilder.d.ts.map