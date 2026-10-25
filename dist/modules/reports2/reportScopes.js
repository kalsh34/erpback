"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORT_ROLES = void 0;
exports.roleCanReadReport = roleCanReadReport;
exports.assertReportScope = assertReportScope;
const types_1 = require("../../types");
const ApiError_1 = require("../../common/ApiError");
/**
 * REPORT ROLE SCOPES (DEF-H3 / DEF-M2)
 *
 * Module reports are scoped per role, not by the broad `report.read`
 * permission alone — `report.read` is only the module door. Every endpoint
 * checks the caller's role against the matrix below at BOTH layers:
 *   1. the route (`authorize` + role guard), and
 *   2. the service method (defense in depth for direct service callers/tests).
 *
 * Matrix (acceptance brief):
 *   - HR_ADMIN          → HR reports only
 *   - OPERATIONS        → company/site + operations (guards, guard attendance)
 *   - FINANCE_OFFICER   → staff & guard payroll reports only
 *   - HEAD              → payroll reports (payroll approver role)
 *   - CEO               → all permitted business reports, read-only
 *   - SUPER_ADMIN / SYSTEM_ADMIN → everything (existing admin policy)
 *   - GUARD             → nothing (no report.read at all)
 */
exports.REPORT_ROLES = {
    hr: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.CEO],
    sites: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.OPERATIONS, types_1.UserRole.CEO],
    guards: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.OPERATIONS, types_1.UserRole.CEO],
    'guard-attendance': [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.OPERATIONS, types_1.UserRole.CEO],
    'staff-attendance': [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.CEO],
    payroll: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.FINANCE_OFFICER, types_1.UserRole.HEAD, types_1.UserRole.CEO],
    // Administration reports: explicit admin permissions, never via report.read.
    audit: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HEAD, types_1.UserRole.FINANCE_OFFICER],
    users: [types_1.UserRole.SUPER_ADMIN, types_1.UserRole.SYSTEM_ADMIN, types_1.UserRole.HR_ADMIN, types_1.UserRole.FINANCE_OFFICER, types_1.UserRole.CEO],
};
/** Pure check — no side effects (used by tests and the route guard). */
function roleCanReadReport(role, report) {
    if (!role)
        return false;
    return exports.REPORT_ROLES[report].includes(role);
}
/**
 * Throws 403 when the role is not allowed to read `report`. Called INSIDE
 * every ModuleReportsService method (services enforce, not just routes).
 */
function assertReportScope(role, report) {
    if (!roleCanReadReport(role, report)) {
        throw ApiError_1.ApiError.forbidden(`Role '${role ?? 'UNKNOWN'}' is not authorized to read the '${report}' report`);
    }
}
//# sourceMappingURL=reportScopes.js.map