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
router.get('/summary', authorize(PERMISSIONS.REPORT_READ), StaffAttendanceController.getMonthlySummary);

export default router;
