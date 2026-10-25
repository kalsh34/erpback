"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDrafts = buildDrafts;
const importFields_1 = require("./importFields");
const FIELD_BY_KEY = new Map(importFields_1.IMPORT_FIELDS.map((f) => [f.key, f]));
function toNumberOrNull(raw) {
    const cleaned = String(raw ?? '').replace(/[, \u00a0]/g, '').trim();
    if (!cleaned)
        return null;
    if (!/^-?\d+(\.\d+)?$/.test(cleaned))
        return null; // messy values pass through as-is per spec
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
}
function wantsRecord(kind, record) {
    if (kind === 'all')
        return true;
    return kind === record;
}
function buildDrafts(input) {
    const kind = input.kind || 'all';
    const employees = [];
    const guarantors = [];
    const contracts = [];
    let skippedNoName = 0;
    const nameCol = input.mapping['name'];
    const phoneCol = input.mapping['phone'];
    const kebeleCol = input.mapping['kebeleId'];
    for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        const cell = (col) => {
            if (col === undefined || col === null || col < 0)
                return '';
            return String(row[col] ?? '').trim();
        };
        const name = cell(nameCol);
        if (!name) {
            skippedNoName += 1;
            continue;
        }
        // Match keys: any mapped field from the catalogue's MATCH_KEY_FIELDS that
        // has a value on this row.
        const matchKeys = [];
        for (const key of importFields_1.MATCH_KEY_FIELDS) {
            const col = input.mapping[key];
            if (col === undefined || col === null)
                continue;
            const v = cell(col);
            if (v)
                matchKeys.push({ field: key, value: v });
        }
        if (wantsRecord(kind, 'employee')) {
            const emp = { sheet: input.sheetName, rowIndex: i };
            for (const f of importFields_1.IMPORT_FIELDS) {
                if (f.record !== 'employee')
                    continue;
                const col = input.mapping[f.key];
                if (col === undefined || col === null)
                    continue;
                const raw = cell(col);
                if (f.numeric) {
                    emp[f.key] = toNumberOrNull(raw);
                }
                else {
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
//# sourceMappingURL=draftBuilder.js.map