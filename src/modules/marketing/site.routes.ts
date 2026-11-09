import { Router } from 'express';
import { ProformaSiteController } from './site.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Client sites (filtered by ?companyId=), the second half of the client block
// on every proforma.
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ProformaSiteController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ProformaSiteController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaSiteController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ProformaSiteController.update);

export default router;
