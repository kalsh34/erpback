import { Router } from 'express';
import { POController } from './po.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.PURCHASE_READ), POController.getAll);
router.get('/:id', authorize(PERMISSIONS.PURCHASE_READ), POController.getById);

router.post('/', authorize(PERMISSIONS.PURCHASE_CREATE), POController.create);
router.put('/:id', authorize(PERMISSIONS.PURCHASE_UPDATE), POController.update);

router.post('/:id/submit', authorize(PERMISSIONS.PURCHASE_UPDATE), POController.submit);
router.post('/:id/approve', authorize(PERMISSIONS.PURCHASE_APPROVE), POController.approve);
router.post('/:id/reject', authorize(PERMISSIONS.PURCHASE_APPROVE), POController.reject);
router.post('/:id/send', authorize(PERMISSIONS.PURCHASE_UPDATE), POController.send);
router.post('/:id/revise', authorize(PERMISSIONS.PURCHASE_UPDATE), POController.revise);

export default router;
