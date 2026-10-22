"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORD_TYPES = void 0;
exports.parseWorkbook = parseWorkbook;
const XLSX = __importStar(require("xlsx"));
const importFields_1 = require("./importFields");
Object.defineProperty(exports, "RECORD_TYPES", { enumerable: true, get: function () { return importFields_1.RECORD_TYPES; } });
/** Header detection scans this many leading rows. */
const HEADER_SCAN_ROWS = 15;
/** Maximum data rows kept per sheet — keeps payloads sane for huge registers. */
const MAX_ROWS_PER_SHEET = 5000;
/**
 * Score one candidate row as a header row: how many distinct fields match its
 * cells exactly or partially, plus points for fill density. Known header
 * matches dominate; fill alone never wins.
 */
function scoreHeaderRow(row, headers) {
    if (!row || row.length === 0)
        return 0;
    const filled = row.filter((c) => String(c ?? '').trim() !== '').length;
    if (filled < 3)
        return 0;
    const taken = new Set();
    let matches = 0;
    for (const cell of row) {
        const text = String(cell ?? '').trim();
        if (!text)
            continue;
        // Local reimplementation of matchField counting to avoid Set churn —
        // exact-then-partial on the catalogue.
        const norm = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        if (!norm)
            continue;
        let hit = null;
        let partial = null;
        for (const f of importFields_1.IMPORT_FIELDS) {
            if (taken.has(f.key))
                continue;
            for (const a of f.accepts) {
                const na = normalizeLocal(a);
                if (!na)
                    continue;
                if (norm === na) {
                    hit = f;
                    break;
                }
                if (!partial && (norm.startsWith(na) || na.startsWith(norm) || norm.includes(na) || na.includes(norm))) {
                    partial = f;
                }
            }
            if (hit)
                break;
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
function normalizeLocal(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '');
}
function detectHeaderRow(rows) {
    let best = null;
    const limit = Math.min(HEADER_SCAN_ROWS, rows.length);
    for (let i = 0; i < limit; i++) {
        const s = scoreHeaderRow(rows[i] || [], []);
        if (s <= 0)
            continue;
        if (!best || s > best.score)
            best = { index: i, score: s };
    }
    return best ? best.index : null;
}
/** Blank headers get placeholders so the UI can still reference the column. */
function headerNames(rawHeader) {
    return rawHeader.map((c, i) => {
        const text = String(c ?? '').replace(/\s+/g, ' ').trim();
        return text || `Column ${i + 1}`;
    });
}
function parseWorkbook(buffer, fileName) {
    // Corrupt workbooks throw inside SheetJS — surfaced as a clear API error by
    // the route handler.
    const wb = XLSX.read(buffer, { type: 'buffer' });
    if (!wb || !Array.isArray(wb.SheetNames)) {
        throw new Error('The file is not a readable workbook');
    }
    const fields = importFields_1.IMPORT_FIELDS.map((f) => ({
        key: f.key,
        record: f.record,
        labelEn: f.labels.en,
        labelAm: f.labels.am,
        numeric: !!f.numeric,
    }));
    const sheets = [];
    for (const name of wb.SheetNames) {
        const ws = wb.Sheets[name];
        if (!ws)
            continue;
        const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: false });
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
        const suggestedMapping = (0, importFields_1.suggestMapping)(columns);
        const dataRows = [];
        for (let i = headerRow + 1; i < grid.length && dataRows.length < MAX_ROWS_PER_SHEET; i++) {
            const row = grid[i];
            if (!row || row.every((c) => String(c ?? '').trim() === ''))
                continue; // skip empty
            dataRows.push(columns.map((_, ci) => String(row?.[ci] ?? '').replace(/\s+/g, ' ').trim()));
        }
        sheets.push({ name, headerRow, columns, suggestedMapping, rows: dataRows });
    }
    return { fileName, sheets, fields };
}
//# sourceMappingURL=excelImport.service.js.map