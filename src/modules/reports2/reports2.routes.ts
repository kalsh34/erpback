import { Router } from 'express';
import { Reports2Controller } from './reports2.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

/**
 * Per-module reports. Every endpoint is gated by REPORT_READ — held by every
 * in-charge role (SUPER_ADMIN, HR_ADMIN, FINANCE_OFFICER, OPERATIONS, HEAD,
 * CEO) and NOT by GUARD, so "the man in charge" sees the pages and guards do not.
 */
router.get('/hr', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.hr);
router.get('/sites', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.sites);
router.get('/guards', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.guards);
router.get('/guard-attendance', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.guardAttendance);
router.get('/staff-attendance', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.staffAttendance);
router.get('/payroll', authorize(PERMISSIONS.REPORT_READ), Reports2Controller.payroll);
router.get('/audit', authorize(PERMISSIONS.AUDIT_READ, PERMISSIONS.REPORT_READ), Reports2Controller.audit);
router.get('/users', authorize(PERMISSIONS.USER_READ, PERMISSIONS.REPORT_READ), Reports2Controller.users);

export default router;
