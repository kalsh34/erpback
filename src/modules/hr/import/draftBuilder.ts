import { IMPORT_FIELDS, MATCH_KEY_FIELDS } from './importFields';

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
  employee: { name: string | null; matchKeys: MatchKey[] };
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

const FIELD_BY_KEY = new Map(IMPORT_FIELDS.map((f) => [f.key, f]));

function toNumberOrNull(raw: string): number | null {
  const cleaned = String(raw ?? '').replace(/[, \u00a0]/g, '').trim();
  if (!cleaned) return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null; // messy values pass through as-is per spec
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function wantsRecord(kind: SheetKind, record: 'employee' | 'guarantor' | 'contract'): boolean {
  if (kind === 'all') return true;
  return kind === record;
}

export function buildDrafts(input: BuildDraftsInput): DraftResult {
  const kind = input.kind || 'all';
  const employees: DraftEmployee[] = [];
  const guarantors: DraftGuarantor[] = [];
  const contracts: DraftContract[] = [];
  let skippedNoName = 0;

  const nameCol = input.mapping['name'];
  const phoneCol = input.mapping['phone'];
  const kebeleCol = input.mapping['kebeleId'];

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i];
    const cell = (col: number | undefined): string => {
      if (col === undefined || col === null || col < 0) return '';
      return String(row[col] ?? '').trim();
    };

    const name = cell(nameCol);
    if (!name) { skippedNoName += 1; continue; }

    // Match keys: any mapped field from the catalogue's MATCH_KEY_FIELDS that
    // has a value on this row.
    const matchKeys: MatchKey[] = [];
    for (const key of MATCH_KEY_FIELDS) {
      const col = input.mapping[key];
      if (col === undefined || col === null) continue;
      const v = cell(col);
      if (v) matchKeys.push({ field: key, value: v });
    }

    if (wantsRecord(kind, 'employee')) {
      const emp: DraftEmployee = { sheet: input.sheetName, rowIndex: i };
      for (const f of IMPORT_FIELDS) {
        if (f.record !== 'employee') continue;
        const col = input.mapping[f.key];
        if (col === undefined || col === null) continue;
        const raw = cell(col);
        if (f.numeric) {
          emp[f.key] = toNumberOrNull(raw);
        } else {
          emp[f.key] = raw || null;
        }
      }
      employees.push(emp);
    }

    if (wantsRecord(kind, 'guarantor')) {
      const guarantorNameCol = input.mapping['guarantorName'];
      const guarantorName = cell(guarantorNameCol);
      if (guarantorName) {
        guarantors.push({
          sheet: input.sheetName,
          rowIndex: i,
          employee: { name, matchKeys },
          guarantorName,
        });
      }
    }

    if (wantsRecord(kind, 'contract')) {
      const salary = cell(input.mapping['salary']);
      const transport = cell(input.mapping['transportAllowance']);
      const total = cell(input.mapping['totalPay']);
      if (salary || transport || total) {
        contracts.push({
          sheet: input.sheetName,
          rowIndex: i,
          employee: { name, matchKeys },
          salary: toNumberOrNull(salary),
          transportAllowance: toNumberOrNull(transport),
          totalPay: toNumberOrNull(total),
        });
      }
    }
  }

  return {
    employees,
    guarantors,
    contracts,
    skippedNoName,
    totalRows: input.rows.length,
  };
}
