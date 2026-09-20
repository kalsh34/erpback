import { Router } from 'express';
import { ShiftScheduleController } from './shiftSchedule.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

/**
 * Shift Scheduling (redesigned rotation module).
 * Reuses the ROTATION_* permissions — same feature area, same roles.
 */
const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROTATION_READ), ShiftScheduleController.getAll);
router.get('/:id', authorize(PERMISSIONS.ROTATION_READ), ShiftScheduleController.getById);
router.post('/', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.create);
router.put('/:id', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.update);
router.delete('/:id', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.delete);

router.post('/:id/guards', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.addGuards);
router.delete('/:id/guards/:guardId', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.removeGuard);
router.put('/:id/pool/reorder', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.reorderPool);
router.post('/:id/floaters', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.addFloaters);
router.delete('/:id/floaters/:guardId', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.removeFloater);

router.get('/:id/preview', authorize(PERMISSIONS.ROTATION_READ), ShiftScheduleController.preview);
router.post('/:id/generate', authorize(PERMISSIONS.ROTATION_GENERATE), ShiftScheduleController.generate);
router.get('/:id/assignments', authorize(PERMISSIONS.ROTATION_READ), ShiftScheduleController.getAssignments);
router.delete('/:id/assignments', authorize(PERMISSIONS.ROTATION_MANAGE), ShiftScheduleController.clearAssignments);
router.get('/:id/commitments', authorize(PERMISSIONS.ROTATION_READ), ShiftScheduleController.getGuardCommitments);

export default router;
