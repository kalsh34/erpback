import { Router } from 'express';
import { CandidateController } from './candidate.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();
router.use(authenticate);

router.get('/stats', authorize(PERMISSIONS.CANDIDATE_READ), CandidateController.getStats);
router.get('/', authorize(PERMISSIONS.CANDIDATE_READ), CandidateController.getAll);
router.post('/', authorize(PERMISSIONS.CANDIDATE_MANAGE), CandidateController.create);
router.put('/:id/stage', authorize(PERMISSIONS.CANDIDATE_MANAGE), CandidateController.updateStage);
router.put('/:id/reject', authorize(PERMISSIONS.CANDIDATE_MANAGE), CandidateController.reject);

export default router;
