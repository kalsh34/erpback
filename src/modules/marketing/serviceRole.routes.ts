import { Router } from 'express';
import { ServiceRoleController } from './serviceRole.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();

router.use(authenticate);

// Service / guard role catalog. Only ACTIVE roles are offered to the proforma
// picker (?activeOnly=true); inactive roles keep their history.
router.get('/', authorize(PERMISSIONS.SERVICE_READ), ServiceRoleController.getAll);
router.get('/:id', authorize(PERMISSIONS.SERVICE_READ), ServiceRoleController.getById);
router.post('/', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ServiceRoleController.create);
router.put('/:id', authorize(PERMISSIONS.SERVICE_MANAGE, PERMISSIONS.PROFORMA_ISSUE), ServiceRoleController.update);

export default router;
