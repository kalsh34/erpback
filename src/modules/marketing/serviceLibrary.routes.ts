import { Router } from 'express';
import { ServiceLibraryController } from './serviceLibrary.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Service Library (Phase A of Proposal & Proforma Management).
// Every write is permission-gated on SERVICE_MANAGE, reads on SERVICE_READ.
// No hard delete exists by design — entries are softly deactivated so proforma
// snapshots (later phase) always resolve to a stable historical record.
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ServiceLibraryController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ServiceLibraryController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE), ServiceLibraryController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE), ServiceLibraryController.update);
router.delete('/:id', authorize(PERMISSIONS.SERVICE_MANAGE), ServiceLibraryController.deactivate);
router.post('/:id/reactivate', authorize(PERMISSIONS.SERVICE_MANAGE), ServiceLibraryController.reactivate);

export default router;
