import { UserRole } from '../../types';
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
export declare const REPORT_ROLES: Record<string, UserRole[]>;
export type ReportKey = keyof typeof REPORT_ROLES;
/** Pure check — no side effects (used by tests and the route guard). */
export declare function roleCanReadReport(role: UserRole | undefined | null, report: ReportKey): boolean;
/**
 * Throws 403 when the role is not allowed to read `report`. Called INSIDE
 * every ModuleReportsService method (services enforce, not just routes).
 */
export declare function assertReportScope(role: UserRole | undefined | null, report: ReportKey): void;
//# sourceMappingURL=reportScopes.d.ts.map