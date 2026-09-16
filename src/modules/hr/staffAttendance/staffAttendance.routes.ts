import { Router } from 'express';
import { StaffAttendanceController } from './staffAttendance.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.post('/day', authorize(PERMISSIONS.STAFF_ATTENDANCE_MANAGE), StaffAttendanceController.saveDayStatus);
router.post('/bulk', authorize(PERMISSIONS.STAFF_ATTENDANCE_MANAGE), StaffAttendanceController.bulkMarkDay);
router.get('/grid', authorize(PERMISSIONS.STAFF_ATTENDANCE_MANAGE), StaffAttendanceController.getGrid);
router.get('/summary', authorize(PERMISSIONS.GUARD_PAYROLL_READ), StaffAttendanceController.getMonthlySummary);
router.get('/periods', authorize(PERMISSIONS.STAFF_ATTENDANCE_MANAGE), StaffAttendanceController.getAllPeriods);
router.post('/lock', authorize(PERMISSIONS.OFFICE_PAYROLL_RATES), StaffAttendanceController.lockPeriod);
router.post('/unlock', authorize(PERMISSIONS.SETTINGS_UPDATE), StaffAttendanceController.unlockPeriod);

export default router;
