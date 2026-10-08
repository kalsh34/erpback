import { Router } from 'express';
import { ReceiptController } from './receipt.controller';
import { authenticate } from '../../../middleware/auth';
import { authorize } from '../../../middleware/rbac';
import { PERMISSIONS } from '../../../types';

const router = Router();

router.use(authenticate);

router.get('/', authorize(PERMISSIONS.PURCHASE_READ), ReceiptController.getAll);
router.get('/:id', authorize(PERMISSIONS.PURCHASE_READ), ReceiptController.getById);
router.post('/', authorize(PERMISSIONS.GRN_MANAGE), ReceiptController.create);

export default router;
