import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';
import { PERMISSIONS } from '../../types';

const router = Router();
router.use(authenticate);

router.get('/', authorize(PERMISSIONS.AUDIT_READ), AuditController.getAll);
router.get('/:id', authorize(PERMISSIONS.AUDIT_READ), AuditController.getById);

export default router;
