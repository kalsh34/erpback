import * as XLSX from 'xlsx';
import { IMPORT_FIELDS, RECORD_TYPES, suggestMapping, FieldDef, RecordType } from './importFields';

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

/** Header detection scans this many leading rows. */
const HEADER_SCAN_ROWS = 15;
/** Maximum data rows kept per sheet — keeps payloads sane for huge registers. */
const MAX_ROWS_PER_SHEET = 5000;

/**
 * Score one candidate row as a header row: how many distinct fields match its
 * cells exactly or partially, plus points for fill density. Known header
 * matches dominate; fill alone never wins.
 */
function scoreHeaderRow(row: unknown[], headers: string[]): number {
  if (!row || row.length === 0) return 0;
  const filled = row.filter((c) => String(c ?? '').trim() !== '').length;
  if (filled < 3) return 0;
  const taken = new Set<string>();
  let matches = 0;
  for (const cell of row) {
    const text = String(cell ?? '').trim();
    if (!text) continue;
    // Local reimplementation of matchField counting to avoid Set churn —
    // exact-then-partial on the catalogue.
    const norm = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    if (!norm) continue;
    let hit: FieldDef | null = null;
    let partial: FieldDef | null = null;
    for (const f of IMPORT_FIELDS) {
      if (taken.has(f.key)) continue;
      for (const a of f.accepts) {
        const na = normalizeLocal(a);
        if (!na) continue;
        if (norm === na) { hit = f; break; }
        if (!partial && (norm.startsWith(na) || na.startsWith(norm) || norm.includes(na) || na.includes(norm))) {
          partial = f;
        }
      }
      if (hit) break;
    }
    if (hit || partial) {
      const f = hit || partial;
      if (f) {
        taken.add(f.key);
        matches += 1;
      }
    }
  }
  // 5 points per matched field + 1 per filled cell beyond the minimum, so a
  // pathological all-filled non-header row never beats a real header.
  return matches * 5 + Math.max(0, filled - 3);
}

function normalizeLocal(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function detectHeaderRow(rows: unknown[][]): number | null {
  let best: { index: number; score: number } | null = null;
  const limit = Math.min(HEADER_SCAN_ROWS, rows.length);
  for (let i = 0; i < limit; i++) {
    const s = scoreHeaderRow(rows[i] || [], []);
    if (s <= 0) continue;
    if (!best || s > best.score) best = { index: i, score: s };
  }
  return best ? best.index : null;
}

/** Blank headers get placeholders so the UI can still reference the column. */
function headerNames(rawHeader: unknown[]): string[] {
  return rawHeader.map((c, i) => {
    const text = String(c ?? '').replace(/\s+/g, ' ').trim();
    return text || `Column ${i + 1}`;
  });
}

export function parseWorkbook(buffer: Buffer, fileName: string): ParsedWorkbook {
  // Corrupt workbooks throw inside SheetJS — surfaced as a clear API error by
  // the route handler.
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb || !Array.isArray(wb.SheetNames)) {
    throw new Error('The file is not a readable workbook');
  }

  const fields: ParsedFieldCatalog[] = IMPORT_FIELDS.map((f) => ({
    key: f.key,
    record: f.record,
    labelEn: f.labels.en,
    labelAm: f.labels.am,
    numeric: !!f.numeric,
  }));

  const sheets: ParsedSheet[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;

    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false }) as unknown[][];
    if (!grid || grid.length === 0) {
      // Empty sheet: still report it so the UI can show it without crashing.
      sheets.push({ name, headerRow: null, columns: [], suggestedMapping: {}, rows: [] });
      continue;
    }

    const headerRow = detectHeaderRow(grid);
    if (headerRow === null) {
      // No header found — treat as unusable rather than guessing.
      sheets.push({ name, headerRow: null, columns: [], suggestedMapping: {}, rows: [] });
      continue;
    }

    const columns = headerNames(grid[headerRow] || []);
    const suggestedMapping = suggestMapping(columns);

    const dataRows: string[][] = [];
    for (let i = headerRow + 1; i < grid.length && dataRows.length < MAX_ROWS_PER_SHEET; i++) {
      const row = grid[i];
      if (!row || row.every((c) => String(c ?? '').trim() === '')) continue; // skip empty
      dataRows.push(
        columns.map((_, ci) => String(row?.[ci] ?? '').replace(/\s+/g, ' ').trim())
      );
    }

    sheets.push({ name, headerRow, columns, suggestedMapping, rows: dataRows });
  }

  return { fileName, sheets, fields };
}

/** Record-type grouping order, re-exported so the route file stays thin. */
export { RECORD_TYPES };
