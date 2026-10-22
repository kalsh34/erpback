import { RECORD_TYPES, RecordType } from './importFields';
/**
 * Excel parsing service. READ-ONLY by design: it imports no database model,
 * so no write path exists by construction. Everything it returns is preview
 * data for the mapping screen.
 */
export interface ParsedFieldCatalog {
    key: string;
    record: RecordType;
    labelEn: string;
    labelAm: string;
    numeric: boolean;
}
export interface ParsedSheet {
    name: string;
    /** 0-based index of the detected header row within the sheet. */
    headerRow: number | null;
    /** Physical header names; blank headers get a stable "Column N" placeholder. */
    columns: string[];
    /** Which field each column was suggested for (field key → column index). */
    suggestedMapping: Record<string, number>;
    /** Data rows as raw text in column order, empty rows skipped. */
    rows: string[][];
}
export interface ParsedWorkbook {
    fileName: string;
    sheets: ParsedSheet[];
    fields: ParsedFieldCatalog[];
}
export declare function parseWorkbook(buffer: Buffer, fileName: string): ParsedWorkbook;
/** Record-type grouping order, re-exported so the route file stays thin. */
export { RECORD_TYPES };
//# sourceMappingURL=excelImport.service.d.ts.map