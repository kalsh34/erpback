import { Router } from 'express';
import { RotationController } from './rotation.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.ROTATION_READ), RotationController.getAll);
router.get('/:id', authorize(PERMISSIONS.ROTATION_READ), RotationController.getById);
router.post('/', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.create);
router.put('/:id', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.update);
router.delete('/:id', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.delete);

router.post('/:id/guards', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.addGuards);
router.delete('/:id/guards/:guardId', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.removeGuard);
router.put('/:id/pool/reorder', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.reorderPool);

router.post('/:id/floaters', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.addFloaters);
router.delete('/:id/floaters/:guardId', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.removeFloater);

router.get('/utils/fairness', RotationController.checkFairness);

router.get('/:id/preview', authorize(PERMISSIONS.ROTATION_READ), RotationController.preview);
router.post('/:id/generate', authorize(PERMISSIONS.ROTATION_GENERATE), RotationController.generate);
router.get('/:id/assignments', authorize(PERMISSIONS.ROTATION_READ), RotationController.getAssignments);

router.post('/:id/activate', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.activate);
router.post('/:id/pause', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.pause);
router.post('/:id/archive', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.archive);

router.get('/:id/leave-cover/pool', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.suggestLeaveCoverA);
router.get('/:id/leave-cover/floater', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.suggestLeaveCoverB);
router.post('/:id/leave-cover', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.applyLeaveCoverage);
router.post('/:id/leave-cover/cancel', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.cancelLeaveCoverage);

export default router;
