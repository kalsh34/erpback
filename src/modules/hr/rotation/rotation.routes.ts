import { Router } from 'express';
import { RotationController } from './rotation.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

// utils (before /:id patterns that could shadow)
router.get('/utils/fairness', authorize(PERMISSIONS.ROTATION_READ), RotationController.checkFairness);

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

router.get('/:id/preview', authorize(PERMISSIONS.ROTATION_READ), RotationController.preview);
router.post('/:id/generate', authorize(PERMISSIONS.ROTATION_GENERATE), RotationController.generate);
router.post('/:id/validate', authorize(PERMISSIONS.ROTATION_READ), RotationController.validate);
router.get('/:id/stats', authorize(PERMISSIONS.ROTATION_READ), RotationController.getStats);
router.get('/:id/conflicts', authorize(PERMISSIONS.ROTATION_READ), RotationController.getConflicts);
router.get('/:id/assignments', authorize(PERMISSIONS.ROTATION_READ), RotationController.getAssignments);

router.post('/:id/approve', authorize(PERMISSIONS.ROTATION_APPROVE), RotationController.approve);
router.post('/:id/publish', authorize(PERMISSIONS.ROTATION_PUBLISH), RotationController.publish);

router.post('/:id/move', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.move);
router.post('/:id/move/override', authorize(PERMISSIONS.ROTATION_OVERRIDE), RotationController.moveOverride);
router.post('/:id/rotate', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.rotate);
router.post('/:id/recalculate', authorize(PERMISSIONS.ROTATION_GENERATE), RotationController.recalculate);

router.post('/:id/activate', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.activate);
router.post('/:id/pause', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.pause);
router.post('/:id/archive', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.archive);
router.post('/:id/complete', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.complete);
router.post('/:id/cancel', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.cancel);

router.get('/:id/leave-cover/pool', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.suggestLeaveCoverA);
router.get('/:id/leave-cover/floater', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.suggestLeaveCoverB);
router.post('/:id/leave-cover', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.applyLeaveCoverage);
router.post('/:id/leave-cover/cancel', authorize(PERMISSIONS.ROTATION_MANAGE), RotationController.cancelLeaveCoverage);

export default router;
