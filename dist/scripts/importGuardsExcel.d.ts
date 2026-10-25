/**
 * Vital ERP — Automated Excel Guard Roster Import Script
 *
 * Imports guard rosters (like `new testBook1.xlsx`) directly into Vital ERP MongoDB.
 * Creates/links:
 *   - Site (creates deployment site if it doesn't already exist)
 *   - Employee (with normalized Amharic names, phone, address, hire date, salary)
 *   - GuardProfile (with position: GUARD or SITE_LEADER, rate, allowances)
 *   - PrimarySiteAssignment (deployment site link)
 *   - Contract (active full-time contract)
 *   - Guarantor (verified guarantor with phone & details)
 *
 * Usage:
 *   npm run import:guards
 *   or: npx ts-node --transpile-only src/scripts/importGuardsExcel.ts [path/to/file.xlsx]
 */
export declare function importGuardsFromExcel(filePath?: string): Promise<void>;
//# sourceMappingURL=importGuardsExcel.d.ts.map