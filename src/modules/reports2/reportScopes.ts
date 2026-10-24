import { UserRole } from '../../types';
import { ApiError } from '../../common/ApiError';

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
export const REPORT_ROLES: Record<string, UserRole[]> = {
  hr: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  sites: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  guards: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  'guard-attendance': [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.OPERATIONS, UserRole.CEO],
  'staff-attendance': [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.CEO],
  payroll: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.FINANCE_OFFICER, UserRole.HEAD, UserRole.CEO],
  // Administration reports: explicit admin permissions, never via report.read.
  audit: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HEAD, UserRole.FINANCE_OFFICER],
  users: [UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HR_ADMIN, UserRole.FINANCE_OFFICER, UserRole.CEO],
};

export type ReportKey = keyof typeof REPORT_ROLES;

/** Pure check — no side effects (used by tests and the route guard). */
export function roleCanReadReport(role: UserRole | undefined | null, report: ReportKey): boolean {
  if (!role) return false;
  return (REPORT_ROLES[report] as UserRole[]).includes(role);
}

/**
 * Throws 403 when the role is not allowed to read `report`. Called INSIDE
 * every ModuleReportsService method (services enforce, not just routes).
 */
export function assertReportScope(role: UserRole | undefined | null, report: ReportKey): void {
  if (!roleCanReadReport(role, report)) {
    throw ApiError.forbidden(
      `Role '${role ?? 'UNKNOWN'}' is not authorized to read the '${report}' report`,
    );
  }
}
