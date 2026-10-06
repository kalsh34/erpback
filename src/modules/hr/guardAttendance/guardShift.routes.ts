import { Router } from 'express';
import { GuardShiftController } from './guardShift.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

/**
 * Mounted at /api/attendance/shifts BEFORE the guardAttendance router so the
 * static '/shifts/...' paths never collide with '/:id/void'.
 */
const router = Router();
router.use(authenticate);

router.post('/clock-in', authorize(PERMISSIONS.GUARD_ATTENDANCE_SELF), GuardShiftController.clockIn);
router.post('/clock-out', authorize(PERMISSIONS.GUARD_ATTENDANCE_SELF), GuardShiftController.clockOut);
router.get('/my', authorize(PERMISSIONS.GUARD_ATTENDANCE_SELF), GuardShiftController.my);

export default router;
