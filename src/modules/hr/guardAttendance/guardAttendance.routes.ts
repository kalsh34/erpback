import { Router } from 'express';
import { GuardAttendanceController } from './guardAttendance.controller';
import { GuardMonthlyHoursController } from './monthlyHours.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/config', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardAttendanceController.getConfig);
router.get('/day', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardAttendanceController.getDay);
router.post('/day', authorize(PERMISSIONS.GUARD_ATTENDANCE_MANAGE), GuardAttendanceController.saveDay);
router.post('/:id/void', authorize(PERMISSIONS.GUARD_ATTENDANCE_MANAGE), GuardAttendanceController.voidRecord);
router.get('/monthly', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardAttendanceController.getMonthly);
router.get('/monthly-sheet', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardMonthlyHoursController.getSheet);
router.post('/monthly-sheet', authorize(PERMISSIONS.GUARD_ATTENDANCE_MANAGE), GuardMonthlyHoursController.saveSheet);
router.get('/monthly-sheet/payroll-hours', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardMonthlyHoursController.getPayrollHours);
router.get('/payroll-readiness', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardAttendanceController.getPayrollReadiness);
router.get('/records', authorize(PERMISSIONS.GUARD_ATTENDANCE_READ), GuardAttendanceController.listRecords);

export default router;
