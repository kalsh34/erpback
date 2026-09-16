import { Router } from 'express';
import { PerformanceController } from './performance.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/stats', authorize(PERMISSIONS.PERFORMANCE_READ), PerformanceController.getStats);
router.get('/top-performers', authorize(PERMISSIONS.PERFORMANCE_READ), PerformanceController.getTopPerformers);
router.get('/reviews-due', authorize(PERMISSIONS.PERFORMANCE_READ), PerformanceController.getReviewsDue);
router.get('/', authorize(PERMISSIONS.PERFORMANCE_READ), PerformanceController.getAll);
router.post('/', authorize(PERMISSIONS.PERFORMANCE_MANAGE), PerformanceController.createOrUpdate);

export default router;
