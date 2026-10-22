import { Router } from 'express';
import { Reports2Controller } from './reports2.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

/**
 * Module-report permissions (DEF-H3 / DEF-M2).
 *
 * Every business endpoint is gated by REPORT_READ plus a ROLE-SCOPE guard
 * (requireReportRole in the controller, re-asserted in ModuleReportsService):
 * a REPORT_READ holder may only read the reports belonging to their own
 * domain — HR sees HR reports, Operations sees sites/guards/guard-attendance,
 * Finance and the Head see payroll, the CEO reads everything but mutates
 * nothing.
 *
 * audit + users require the DEDICATED administration permission on top of the
 * role scope — `report.read` alone must never expose the audit trail or the
 * user list (previously any REPORT_READ role, HR/Operations included, could
 * read both — DEF-M2).
 */
router.get('/hr', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.hr);
router.get('/sites', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.sites);
router.get('/guards', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.guards);
router.get('/guard-attendance', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.guardAttendance);
router.get('/staff-attendance', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.staffAttendance);
router.get('/payroll', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.payroll);
router.get('/audit', authorize(PERMISSIONS.AUDIT_READ), Reports2Controller.audit);
router.get('/users', authorize(PERMISSIONS.USER_READ), Reports2Controller.users);

export default router;
