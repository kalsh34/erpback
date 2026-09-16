import { Router } from 'express';
import { AttendanceController } from './attendance.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/on-duty/:siteId', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getOnDuty);
router.get('/coverage-alerts/:siteId', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getCoverageAlerts);
router.post('/override-clockout/:recordId', authorize(PERMISSIONS.GUARD_MODIFY_HOURS), AttendanceController.overrideClockOut);
router.post('/clock-in', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.clockIn);
router.post('/clock-out/:guardId', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.clockOut);
router.get('/active/:guardId', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.getActiveShift);
router.get('/today/:guardId', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.getTodayRecord);
router.get('/recent/:guardId', authorize(PERMISSIONS.ATTENDANCE_CLOCK), AttendanceController.getRecentRecords);
router.get('/guard/:guardId', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getGuardHours);
router.put('/:id/edit', authorize(PERMISSIONS.GUARD_MODIFY_HOURS), AttendanceController.editHours);
router.get('/guard/:guardId/period', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getByGuardAndPeriod);
router.get('/', authorize(PERMISSIONS.ATTENDANCE_READ), AttendanceController.getAllAttendance);

router.post('/manual-entry', authorize(PERMISSIONS.ATTENDANCE_FILE), AttendanceController.manualEntry);
router.post('/manual-entry/bulk', authorize(PERMISSIONS.ATTENDANCE_FILE), AttendanceController.manualEntryBulk);
router.put('/manual-entry/:id', authorize(PERMISSIONS.ATTENDANCE_FILE), AttendanceController.correctManualEntry);

export default router;
